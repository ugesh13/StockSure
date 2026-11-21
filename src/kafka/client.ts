import kafkajs from 'kafkajs';
import type { Admin, Consumer, Kafka as KafkaType, Producer, SASLOptions } from 'kafkajs';
import { cfg } from '../config.ts';
import { decodeB64 } from '../util.ts';

const { Kafka, logLevel } = kafkajs;

export const TOPICS = { orders: 'orders', inventory: 'inventory', dlq: 'dlq' } as const;
export type TopicName = (typeof TOPICS)[keyof typeof TOPICS];

let kafka: KafkaType | undefined;

/** Aiven Kafka over TLS. Certificate auth (service.cert + service.key) or SASL. Files arrive as base64 env vars. */
export function getKafka(): KafkaType {
  if (kafka) return kafka;
  const c = cfg();
  const useSasl = Boolean(c.KAFKA_SASL_USERNAME && c.KAFKA_SASL_PASSWORD);
  const ssl = useSasl
    ? { ca: [decodeB64(c.KAFKA_CA_B64)], rejectUnauthorized: true }
    : { ca: [decodeB64(c.KAFKA_CA_B64)], cert: decodeB64(c.KAFKA_CERT_B64), key: decodeB64(c.KAFKA_KEY_B64), rejectUnauthorized: true };
  const sasl: SASLOptions | undefined = useSasl
    ? ({ mechanism: c.KAFKA_SASL_MECHANISM, username: c.KAFKA_SASL_USERNAME, password: c.KAFKA_SASL_PASSWORD } as SASLOptions)
    : undefined;

  kafka = new Kafka({
    clientId: c.KAFKA_CLIENT_ID,
    brokers: c.KAFKA_BROKERS.split(',').map((b) => b.trim()).filter(Boolean),
    ssl,
    ...(sasl ? { sasl } : {}),
    logLevel: logLevel.WARN,
    connectionTimeout: 10_000,
    requestTimeout: 30_000,
    retry: { initialRetryTime: 300, retries: 8 },
  });
  return kafka;
}

let producerPromise: Promise<Producer> | undefined;

/** One shared producer per process. */
export function getProducer(): Promise<Producer> {
  if (!producerPromise) {
    const attempt = (async () => {
      const p = getKafka().producer({ allowAutoTopicCreation: false });
      p.on(p.events.DISCONNECT, () => {
        producerPromise = undefined; // reconnect on next use
      });
      await p.connect();
      return p;
    })();
    producerPromise = attempt;
    attempt.catch(() => {
      if (producerPromise === attempt) producerPromise = undefined;
    });
  }
  return producerPromise;
}

let adminPromise: Promise<Admin> | undefined;

export function getAdmin(): Promise<Admin> {
  if (!adminPromise) {
    const attempt = (async () => {
      const a = getKafka().admin();
      a.on(a.events.DISCONNECT, () => {
        adminPromise = undefined;
      });
      await a.connect();
      return a;
    })();
    adminPromise = attempt;
    attempt.catch(() => {
      if (adminPromise === attempt) adminPromise = undefined;
    });
  }
  return adminPromise;
}

export function newConsumer(groupId: string): Consumer {
  return getKafka().consumer({ groupId, sessionTimeout: 30_000, heartbeatInterval: 3000 });
}

export async function pingKafka(): Promise<Record<string, unknown>> {
  const admin = await getAdmin();
  const existing = new Set(await admin.listTopics());
  const needed = Object.values(TOPICS);
  const missing = needed.filter((t) => !existing.has(t));
  if (missing.length > 0) throw new Error(`topics missing: ${missing.join(', ')} (run npm run setup:kafka)`);
  // Messages are sent to explicit partitions 0..KAFKA_PARTITIONS-1, so a topic with fewer partitions would fail every send.
  const meta = await admin.fetchTopicMetadata({ topics: [...needed] });
  const need = cfg().KAFKA_PARTITIONS;
  const small = meta.topics.filter((t) => t.partitions.length < need).map((t) => `${t.name} has ${t.partitions.length}`);
  if (small.length > 0) throw new Error(`need ${need} partitions per topic: ${small.join(', ')}. Set KAFKA_PARTITIONS to match.`);
  return { topics: needed, partitions: need };
}

export async function closeKafka(): Promise<void> {
  const p = producerPromise;
  const a = adminPromise;
  producerPromise = undefined;
  adminPromise = undefined;
  if (p) await p.then((x) => x.disconnect()).catch(() => undefined);
  if (a) await a.then((x) => x.disconnect()).catch(() => undefined);
}
