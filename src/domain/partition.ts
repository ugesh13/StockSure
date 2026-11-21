/**
 * Deterministic partition for a message key (FNV-1a, 32 bit).
 * The relay chooses the partition itself so it can compute the exact Kafka offset of every message
 * (base offset + position inside the batch) and store it on the outbox row for the proof panel.
 * The same key always lands on the same partition, so events for one order or one stock item stay in order.
 */
export function partitionFor(key: string, partitions: number): number {
  let h = 0x811c9dc5;
  for (const byte of Buffer.from(key, 'utf8')) {
    h ^= byte;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h % partitions;
}
