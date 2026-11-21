import { cfg } from '../config.ts';
import { getPool } from '../db.ts';
import { partitionFor } from '../domain/partition.ts';
import { getProducer } from '../kafka/client.ts';
import { log, errFields } from '../log.ts';
import { RELAY_FAILED_SQL, RELAY_MARK_SQL, RELAY_SELECT_SQL } from '../sql.ts';
import { sleep } from '../util.ts';

type OutboxRow = { id: number; topic: string; key: string; payload: unknown };

/**
 * Move one batch of saved events from the outbox into Kafka. Run exactly one relay.
 * Delivery is at-least-once: a crash between "sent" and "marked" re-sends the batch, and consumers ignore duplicates.
 * Returns how many events were published.
 */
export async function relayOnce(): Promise<number> {
  const partitions = cfg().KAFKA_PARTITIONS;
  const client = await getPool().connect();
  let broken = false;
  let pendingIds: number[] = [];
  try {
    await client.query('BEGIN');
    const { rows } = await client.query<OutboxRow>(RELAY_SELECT_SQL);
    if (rows.length === 0) {
      await client.query('COMMIT');
      return 0;
    }
    pendingIds = rows.map((r) => r.id);

    // Group by topic and choose the partition ourselves so every message's offset can be computed:
    // offset = baseOffset (returned by Kafka for the partition) + position inside this batch for that partition.
    const byTopic = new Map<string, { row: OutboxRow; partition: number }[]>();
    for (const row of rows) {
      const list = byTopic.get(row.topic) ?? [];
      list.push({ row, partition: partitionFor(row.key, partitions) });
      byTopic.set(row.topic, list);
    }

    const producer = await getProducer();
    const results = await producer.sendBatch({
      acks: -1, // wait for all in-sync replicas
      topicMessages: [...byTopic.entries()].map(([topic, items]) => ({
        topic,
        messages: items.map(({ row, partition }) => ({
          key: row.key,
          value: JSON.stringify(row.payload),
          partition,
          headers: { event_id: String((row.payload as { event_id?: string }).event_id ?? '') },
        })),
      })),
    });

    const base = new Map<string, bigint>();
    for (const r of results) {
      if (r.errorCode !== 0 || r.baseOffset === undefined) throw new Error(`kafka rejected ${r.topicName}/${r.partition}: error ${r.errorCode}`);
      base.set(`${r.topicName}:${r.partition}`, BigInt(r.baseOffset));
    }

    const ids: number[] = [];
    const parts: number[] = [];
    const offsets: number[] = [];
    for (const [topic, items] of byTopic) {
      const seen = new Map<number, number>();
      for (const { row, partition } of items) {
        const b = base.get(`${topic}:${partition}`);
        if (b === undefined) throw new Error(`no kafka result for ${topic}/${partition}`);
        const index = seen.get(partition) ?? 0;
        seen.set(partition, index + 1);
        ids.push(row.id);
        parts.push(partition);
        offsets.push(Number(b) + index);
      }
    }
    await client.query(RELAY_MARK_SQL, [ids, parts, offsets]);
    await client.query('COMMIT');
    return rows.length;
  } catch (e) {
    try {
      await client.query('ROLLBACK');
      if (pendingIds.length > 0) await client.query(RELAY_FAILED_SQL, [pendingIds]);
    } catch {
      broken = true;
    }
    throw e;
  } finally {
    client.release(broken);
  }
}

/** Polling loop (300-500 ms). Backs off when Kafka or Postgres is unavailable. */
export function startRelay(): { stop: () => Promise<void> } {
  let stopped = false;
  const done = (async () => {
    let backoff = 0;
    while (!stopped) {
      try {
        const n = await relayOnce();
        backoff = 0;
        if (n === 0) await sleep(cfg().RELAY_INTERVAL_MS);
      } catch (e) {
        backoff = Math.min(backoff ? backoff * 2 : 500, 10_000);
        log('error', 'relay failed, will retry', { backoff_ms: backoff, ...errFields(e) });
        await sleep(backoff);
      }
    }
  })();
  return {
    stop: async () => {
      stopped = true;
      await done;
    },
  };
}
