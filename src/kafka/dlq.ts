import { cfg } from '../config.ts';
import { partitionFor } from '../domain/partition.ts';
import { log } from '../log.ts';
import { sleep } from '../util.ts';
import { TOPICS, getProducer, newConsumer } from './client.ts';

// Dead-letter queue. A message that failed 3 times is parked here with the error and its origin.

export type DlqRecord = {
  consumer: string;
  source_topic: string;
  key: string | null;
  failed_at: string;
  error: string;
  original: string; // the raw message exactly as received
};

export async function publishDlq(rec: Omit<DlqRecord, 'failed_at'>): Promise<void> {
  const producer = await getProducer();
  const value: DlqRecord = { ...rec, failed_at: new Date().toISOString() };
  const key = rec.key ?? 'unknown';
  await producer.send({
    topic: TOPICS.dlq,
    acks: -1,
    messages: [{ key, value: JSON.stringify(value), partition: partitionFor(key, cfg().KAFKA_PARTITIONS) }],
  });
  log('warn', 'event sent to dlq', { consumer: rec.consumer, topic: rec.source_topic, key: rec.key, error: rec.error });
}

/**
 * Re-send every parked message to its original topic. Safe to run repeatedly: consumers ignore duplicates,
 * and the replayer's own consumer group remembers what it already replayed.
 */
export async function replayDlq(opts: { maxMessages?: number; firstMessageWaitMs?: number; idleMs?: number; totalMs?: number } = {}): Promise<{ replayed: number; skipped: number }> {
  const maxMessages = opts.maxMessages ?? 200;
  const firstWait = opts.firstMessageWaitMs ?? 12_000; // joining a consumer group takes a few seconds
  const idleMs = opts.idleMs ?? 3000;
  const totalMs = opts.totalMs ?? 25_000;

  const consumer = newConsumer('dlq-replayer');
  const producer = await getProducer();
  const partitions = cfg().KAFKA_PARTITIONS;
  const started = Date.now();
  let lastActivity = Date.now();
  let seenAny = false;
  let replayed = 0;
  let skipped = 0;

  await consumer.connect();
  try {
    await consumer.subscribe({ topic: TOPICS.dlq, fromBeginning: true });
    await consumer.run({
      eachMessage: async ({ message }) => {
        seenAny = true;
        lastActivity = Date.now();
        let rec: DlqRecord;
        try {
          rec = JSON.parse(message.value?.toString() ?? '') as DlqRecord;
        } catch {
          skipped++;
          return;
        }
        if (!rec.source_topic || !rec.original || (rec.source_topic !== TOPICS.orders && rec.source_topic !== TOPICS.inventory)) {
          skipped++;
          return;
        }
        const key = rec.key ?? 'unknown';
        await producer.send({
          topic: rec.source_topic,
          acks: -1,
          messages: [{ key, value: rec.original, partition: partitionFor(key, partitions) }],
        });
        replayed++;
      },
    });

    while (replayed + skipped < maxMessages && Date.now() - started < totalMs) {
      const quiet = Date.now() - lastActivity;
      if (seenAny ? quiet > idleMs : quiet > firstWait) break;
      await sleep(250);
    }
  } finally {
    await consumer.stop().catch(() => undefined);
    await consumer.disconnect().catch(() => undefined);
  }
  log('info', 'dlq replay finished', { replayed, skipped });
  return { replayed, skipped };
}
