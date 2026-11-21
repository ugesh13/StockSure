import { withTx } from '../db.ts';
import { sortLines } from '../domain/lines.ts';
import type { StockLine } from '../domain/lines.ts';
import type { AppEvent } from '../events.ts';
import { CLAIM_EVENT_SQL, FINALIZE_ORDER_SQL, ORDER_LINES_FOR_STOCK_SQL, ORDER_STATE_SQL } from '../sql.ts';
import { changeStock } from '../services/stock.ts';

export const FINALIZER_GROUP = 'inventory-finalizer';

/**
 * order.placed -> on_hand and reserved both drop by qty. This is the "listener reduces inventory" from the brief.
 * Available stock (on_hand - reserved - buffer) does not change here, so finalizing can never cause an oversell.
 * Duplicate-safe three ways: processed_events (same event), orders.finalized_at (same order, new event id),
 * and everything is one transaction (a crash leaves nothing half done).
 */
export async function handleFinalizer(event: AppEvent): Promise<void> {
  if (event.type !== 'order.placed') return;
  const orderId = event.data.order_id;

  await withTx(async (c) => {
    const claim = await c.query(CLAIM_EVENT_SQL, [FINALIZER_GROUP, event.event_id]);
    if ((claim.rowCount ?? 0) === 0) return; // this exact event was already applied

    const done = await c.query(FINALIZE_ORDER_SQL, [orderId]);
    if ((done.rowCount ?? 0) === 0) {
      const st = await c.query<{ status: string; finalized_at: string | null }>(ORDER_STATE_SQL, [orderId]);
      const row = st.rows[0];
      if (!row) throw new Error(`order ${orderId} not found`);
      if (row.finalized_at) return; // already finalized by an earlier event
      throw new Error(`order ${orderId} is ${row.status}, expected PLACED`);
    }

    // The database is the truth for the lines, not the message.
    const lines = sortLines((await c.query<StockLine>(ORDER_LINES_FOR_STOCK_SQL, [orderId])).rows);
    for (const l of lines) {
      await changeStock(c, l.branch_id, l.product_id, 'ONLINE_SALE', orderId, (cur) => {
        if (cur.reserved < l.qty) throw new Error(`reserved ${cur.reserved} < qty ${l.qty} for ${l.branch_id}:${l.product_id}`);
        return { on_hand: Math.max(cur.on_hand - l.qty, 0), reserved: cur.reserved - l.qty };
      });
    }
  });
}
