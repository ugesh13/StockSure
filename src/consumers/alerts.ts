import { withTx } from '../db.ts';
import type { AppEvent } from '../events.ts';
import { log } from '../log.ts';
import { ALERT_MARK_SQL, ALERT_WAITING_SQL, CLAIM_EVENT_SQL } from '../sql.ts';

export const ALERTS_GROUP = 'stock-alerts';

/**
 * inventory.changed -> if available stock went from 0 (or less) to above 0, notify the shoppers waiting for it.
 * The claim row, the alert rows and the notification are one transaction, so a duplicate event notifies nobody twice.
 */
export async function handleAlerts(event: AppEvent): Promise<void> {
  if (event.type !== 'inventory.changed') return;
  const d = event.data;
  const available = d.on_hand - d.reserved - d.buffer;
  if (!(d.prev_available <= 0 && available > 0)) return;

  await withTx(async (c) => {
    const claim = await c.query(CLAIM_EVENT_SQL, [ALERTS_GROUP, event.event_id]);
    if ((claim.rowCount ?? 0) === 0) return;
    const waiting = await c.query<{ id: number; customer_id: number }>(ALERT_WAITING_SQL, [d.product_id, d.branch_id]);
    if (waiting.rows.length === 0) return;
    await c.query(ALERT_MARK_SQL, [waiting.rows.map((w) => w.id)]);
    for (const w of waiting.rows) {
      log('info', 'back-in-stock notification sent', { customer_id: w.customer_id, product_id: d.product_id, branch_id: d.branch_id, available });
    }
  });
}
