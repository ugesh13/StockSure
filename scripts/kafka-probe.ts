import fs from 'node:fs';
import { cfg, loadConfigOrExit } from '../src/config.ts';
import kafkajs from 'kafkajs';
import { decodeB64, sleep } from '../src/util.ts';

loadConfigOrExit(['kafka']);

const c = cfg();
const logStream = fs.createWriteStream('kafka-probe.log', { flags: 'w' });

function maskSecrets(msg: string): string {
  let masked = msg;
  if (c.KAFKA_SASL_PASSWORD) masked = masked.replaceAll(c.KAFKA_SASL_PASSWORD, '***');
  if (c.KAFKA_SASL_USERNAME) masked = masked.replaceAll(c.KAFKA_SASL_USERNAME, '***');
  return masked;
}

const customLogCreator = () => ({ namespace, label, log }: any) => {
  const { message, ...extra } = log;
  const line = `[${new Date().toISOString()}] [${label}] [${namespace}] ${message} ${JSON.stringify(extra)}\n`;
  logStream.write(maskSecrets(line));
};

const useSasl = Boolean(c.KAFKA_SASL_USERNAME && c.KAFKA_SASL_PASSWORD);
const ssl = useSasl
  ? { ca: [decodeB64(c.KAFKA_CA_B64)], rejectUnauthorized: true }
  : { ca: [decodeB64(c.KAFKA_CA_B64)], cert: decodeB64(c.KAFKA_CERT_B64), key: decodeB64(c.KAFKA_KEY_B64), rejectUnauthorized: true };
const sasl = useSasl
  ? ({ mechanism: c.KAFKA_SASL_MECHANISM, username: c.KAFKA_SASL_USERNAME, password: c.KAFKA_SASL_PASSWORD } as const)
  : undefined;

const kafka = new kafkajs.Kafka({
  clientId: `${c.KAFKA_CLIENT_ID}-probe`,
  brokers: c.KAFKA_BROKERS.split(',').map((b) => b.trim()).filter(Boolean),
  ssl,
  ...(sasl ? { sasl: sasl as any } : {}),
  logLevel: kafkajs.logLevel.DEBUG,
  logCreator: customLogCreator,
});

const admin = kafka.admin();

console.log('--- Kafka Probe Starting ---');
const t0 = performance.now();
await admin.connect();
const connectMs = performance.now() - t0;
console.log(`admin.connect(): ${connectMs.toFixed(2)} ms`);

const t1 = performance.now();
const topics = await admin.listTopics();
const listTopicsMs = performance.now() - t1;
console.log(`listTopics(): ${listTopicsMs.toFixed(2)} ms (found ${topics.length} topics: ${topics.join(', ')})`);

const t2 = performance.now();
const meta = await admin.fetchTopicMetadata({ topics: topics.slice(0, 5) });
const metaMs = performance.now() - t2;
console.log(`fetchTopicMetadata(): ${metaMs.toFixed(2)} ms (metadata for ${meta.topics.length} topics)`);

console.log('Sampling 10-second process.cpuUsage()...');
const cpuStart = process.cpuUsage();
const hrStart = process.hrtime.bigint();
await sleep(10_000);
const cpuEnd = process.cpuUsage(cpuStart);
const hrEnd = process.hrtime.bigint();
const elapsedSec = Number(hrEnd - hrStart) / 1e9;
const totalCpuSec = (cpuEnd.user + cpuEnd.system) / 1e6;
const cpuPercent = (totalCpuSec / elapsedSec) * 100;
console.log(`CPU sample over ${elapsedSec.toFixed(2)} s: user=${(cpuEnd.user / 1e6).toFixed(3)}s, system=${(cpuEnd.system / 1e6).toFixed(3)}s, total=${totalCpuSec.toFixed(3)}s (${cpuPercent.toFixed(1)}% of one core)`);

await admin.disconnect();
logStream.end();
console.log('--- Kafka Probe Finished ---');

