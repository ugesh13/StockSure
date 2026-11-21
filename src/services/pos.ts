import type { PoolClient } from 'pg';
import { withTx } from '../db.ts';
import { notFound } from '../errors.ts';
import { HEARTBEAT_SQL, NEWEST_HOLDER_SQL } from '../sql.ts';
import { releaseHold } from './orders.ts';
import { changeStock, lockStock } from './stock.ts';
import type { StockRow } from './stock.ts';

// One ledger for store sales, staff counts and restocks. A real sale in a real shop cannot be rejected,
// so it is always applied; the conflict check then fixes any online hold that points at stock that is gone.

export type StaffResult = { before: StockRow; after: StockRow; needs_rescue_orders: string[] };

/**
 * If reserved > on_hand, some unpaid online holds now point at stock that no longer exists.
 * Release the newest holds (all their lines) until it balances and mark those orders NEEDS_RESCUE.
 * Paid orders waiting to be finalized are never touched.
 */
export async function resolveConflicts(c: PoolClient, branchId: number, productId: number): Promise<string[]> {
  const released: string[] = [];
  for (;;) {
    const cur = await lockStock(c, branchId, productId);
    if (cur.reserved <= cur.on_hand) break;
    const holder = await c.query<{ id: string }>(NEWEST_HOLDER_SQL, [branchId, productId]);
    const id = holder.rows[0]?.id;
    if (!id) break; // only paid orders remain; nothing releasable
    await releaseHold(c, id, 'NEEDS_RESCUE');
    released.push(id);
  }
  return released;
}

async function beat(c: PoolClient, branchId: number): Promise<void> {
  const r = await c.query(HEARTBEAT_SQL, [branchId]);
  if ((r.rowCount ?? 0) === 0) throw notFound('Branch');
}

/** POS sale: on_hand = GREATEST(on_hand - qty, 0). */
export async function posSale(branchId: number, productId: number, qty: number): Promise<StaffResult> {
  return withTx(async (c) => {
    const { before, after } = await changeStock(c, branchId, productId, 'POS_SALE', null, (cur) => ({
      on_hand: Math.max(cur.on_hand - qty, 0),
      reserved: cur.reserved,
    }));
    await beat(c, branchId);
    const needs_rescue_orders = await resolveConflicts(c, branchId, productId);
    return { before, after, needs_rescue_orders };
  });
}

/** Staff count: set on_hand to the counted number. The difference is written to the ledger as STAFF_COUNT. */
export async function staffCount(branchId: number, productId: number, counted: number): Promise<StaffResult> {
  return withTx(async (c) => {
    const { before, after } = await changeStock(c, branchId, productId, 'STAFF_COUNT', null, (cur) => ({
      on_hand: counted,
      reserved: cur.reserved,
    }));
    await beat(c, branchId);
    const needs_rescue_orders = await resolveConflicts(c, branchId, productId);
    return { before, after, needs_rescue_orders };
  });
}

/** Restock: add to on_hand. The inventory.changed event triggers back-in-stock alerts through Kafka. */
export async function restock(branchId: number, productId: number, qty: number): Promise<StaffResult> {
  return withTx(async (c) => {
    const { before, after } = await changeStock(c, branchId, productId, 'RESTOCK', null, (cur) => ({
      on_hand: cur.on_hand + qty,
      reserved: cur.reserved,
    }));
    await beat(c, branchId);
    return { before, after, needs_rescue_orders: [] };
  });
}

/** The branch confirms its stock is current (the freshness rule reads this). */
export async function heartbeat(branchId: number): Promise<void> {
  await withTx((c) => beat(c, branchId));
}
