import { getPool, withTx } from '../db.ts';
import type { AppEvent } from '../events.ts';
import { log } from '../log.ts';
import { CLAIM_EVENT_SQL, EVENT_SEEN_SQL, NOTIFY_SQL } from '../sql.ts';

export const NOTIFIER_GROUP = 'notifier';

/**
 * order.placed -> send the confirmation. Sends first, records second: a crash in between causes a duplicate
 * message at worst, never a lost one. A repeated event is skipped because it is already recorded.
 * (Real email is optional; the log line stands in for the send.)
 */
export async function handleNotifier(event: AppEvent): Promise<void> {
  if (event.type !== 'order.placed') return;

  const seen = await getPool().query(EVENT_SEEN_SQL, [NOTIFIER_GROUP, event.event_id]);
  if (seen.rows.length > 0) return;

  log('info', 'order confirmation sent', {
    order_id: event.data.order_id,
    customer_id: event.data.customer_id,
    lines: event.data.lines.length,
  });

  await withTx(async (c) => {
    await c.query(CLAIM_EVENT_SQL, [NOTIFIER_GROUP, event.event_id]);
    await c.query(NOTIFY_SQL, [event.data.order_id, 'ORDER_CONFIRMATION']);
  });
}
