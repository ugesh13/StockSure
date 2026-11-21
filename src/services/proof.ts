import { getPool } from '../db.ts';
import { notFound } from '../errors.ts';
import { getDoc } from '../search/opensearch.ts';
import {
  PROOF_CONSUMER_SQL,
  PROOF_LEDGER_SQL,
  PROOF_OUTBOX_SQL,
  PROOF_STOCK_SQL,
  RECENT_OUTBOX_SQL,
  RECENT_PROCESSED_SQL,
} from '../sql.ts';
import { loadOrder } from './orders.ts';

// The four-tick proof for the judges. Each tick reads real data from a different system.

export async function proofFor(orderId: string) {
  const db = getPool();
  const order = await loadOrder(db, orderId);
  if (!order) throw notFound('Order');

  const [outbox, stock] = await Promise.all([
    db.query<{ id: number; published_at: string | null; kafka_partition: number | null; kafka_offset: number | null; attempts: number; event_id: string }>(PROOF_OUTBOX_SQL, [orderId]),
    db.query<{ branch_id: number; product_id: number; on_hand: number; reserved: number; buffer: number; rev: number }>(PROOF_STOCK_SQL, [orderId]),
  ]);
  const ob = outbox.rows[0];

  const consumers = ob ? (await db.query<{ consumer: string; processed_at: string }>(PROOF_CONSUMER_SQL, [ob.event_id])).rows : [];
  const ledger = (await db.query<{ branch_id: number; product_id: number; kind: string; delta_on_hand: number; delta_reserved: number }>(PROOF_LEDGER_SQL, [orderId])).rows;

  // OpenSearch: is the document for every line in step with Postgres?
  const docs = await Promise.all(
    stock.rows.map(async (s) => {
      try {
        const d = await getDoc(s.product_id, s.branch_id);
        return { branch_id: s.branch_id, product_id: s.product_id, pg_rev: s.rev, doc_rev: d?.rev ?? null, available: d?.available ?? null, status: d?.status ?? null, in_sync: d !== null && d.rev === s.rev };
      } catch {
        return { branch_id: s.branch_id, product_id: s.product_id, pg_rev: s.rev, doc_rev: null, available: null, status: null, in_sync: false };
      }
    }),
  );

  const finalizerDone = consumers.some((c) => c.consumer === 'inventory-finalizer') && order.finalized_at !== null && ledger.length > 0;
  const ticks = {
    postgres: { ok: order.status === 'PLACED' && Boolean(ob), order_status: order.status, outbox_id: ob?.id ?? null, event_id: ob?.event_id ?? null },
    kafka: {
      ok: Boolean(ob?.published_at),
      topic: 'orders',
      partition: ob?.kafka_partition ?? null,
      offset: ob?.kafka_offset ?? null,
      published_at: ob?.published_at ?? null,
      attempts: ob?.attempts ?? 0,
    },
    consumer: {
      ok: finalizerDone,
      processed_by: consumers.map((c) => c.consumer),
      ledger,
      finalized_at: order.finalized_at,
    },
    opensearch: { ok: docs.length > 0 && docs.every((d) => d.in_sync), documents: docs },
  };
  return { order_id: orderId, complete: Object.values(ticks).every((t) => t.ok), ticks };
}

export async function recentEvents() {
  const db = getPool();
  const [outbox, processed] = await Promise.all([db.query(RECENT_OUTBOX_SQL), db.query(RECENT_PROCESSED_SQL)]);
  return { outbox: outbox.rows, processed_events: processed.rows };
}
