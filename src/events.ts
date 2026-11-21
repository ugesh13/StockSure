import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Db } from './db.ts';

// Event contract. Validated with Zod when written to the outbox AND when read by a consumer.

const LineSchema = z.object({
  branch_id: z.number().int().positive(),
  product_id: z.number().int().positive(),
  qty: z.number().int().min(1).max(10),
});

const Envelope = {
  event_id: z.string().uuid(),
  version: z.literal(1),
  occurred_at: z.string().min(10),
};

export const OrderPlacedSchema = z.object({
  ...Envelope,
  type: z.literal('order.placed'),
  data: z.object({
    order_id: z.string().uuid(),
    customer_id: z.number().int().positive(),
    lines: z.array(LineSchema).min(1),
  }),
});

export const OrderExpiredSchema = z.object({
  ...Envelope,
  type: z.literal('order.expired'),
  data: z.object({
    order_id: z.string().uuid(),
    customer_id: z.number().int().positive(),
    lines: z.array(LineSchema).min(1),
  }),
});

export const InventoryChangedSchema = z.object({
  ...Envelope,
  type: z.literal('inventory.changed'),
  data: z.object({
    branch_id: z.number().int().positive(),
    product_id: z.number().int().positive(),
    on_hand: z.number().int().min(0),
    reserved: z.number().int().min(0),
    buffer: z.number().int().min(0),
    rev: z.number().int().min(0),
    prev_available: z.number().int(), // available before this change, lets stock-alerts detect 0 -> positive
  }),
});

export const EventSchema = z.discriminatedUnion('type', [OrderPlacedSchema, OrderExpiredSchema, InventoryChangedSchema]);

export type AppEvent = z.infer<typeof EventSchema>;
export type OrderPlacedEvent = z.infer<typeof OrderPlacedSchema>;
export type InventoryChangedEvent = z.infer<typeof InventoryChangedSchema>;
export type OutboxTopic = 'orders' | 'inventory';

/** Save an event in the outbox, inside the caller's transaction. The relay publishes it to Kafka later. */
export async function enqueue(db: Db, topic: OutboxTopic, key: string, type: AppEvent['type'], data: unknown): Promise<string> {
  const event = EventSchema.parse({
    event_id: randomUUID(),
    type,
    version: 1,
    occurred_at: new Date().toISOString(),
    data,
  });
  await db.query('INSERT INTO outbox (topic, key, payload) VALUES ($1::text, $2::text, $3::jsonb)', [topic, key, JSON.stringify(event)]);
  return event.event_id;
}
