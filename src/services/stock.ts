import type { Db } from '../db.ts';
import { AppError } from '../errors.ts';
import { enqueue } from '../events.ts';
import { LEDGER_SQL, LOCK_STOCK_SQL, SET_STOCK_SQL } from '../sql.ts';

// Every stock change in the system goes through here: lock the row, set the numbers, write one ledger row,
// write one inventory.changed event to the outbox. All inside the caller's transaction.

export type LedgerKind = 'HOLD' | 'RELEASE' | 'ONLINE_SALE' | 'POS_SALE' | 'STAFF_COUNT' | 'RESTOCK';
export type StockRow = { on_hand: number; reserved: number; buffer: number; rev: number };

export async function lockStock(db: Db, branchId: number, productId: number): Promise<StockRow> {
  const r = await db.query<StockRow>(LOCK_STOCK_SQL, [branchId, productId]);
  const row = r.rows[0];
  if (!row) throw new AppError(404, 'NOT_FOUND', `No stock row for branch ${branchId} and product ${productId}`);
  return row;
}

/** Ledger row + inventory.changed event for a change that has already been applied to `after`. */
export async function recordChange(
  db: Db,
  a: { branchId: number; productId: number; after: StockRow; kind: LedgerKind; deltaOnHand: number; deltaReserved: number; ref: string | null },
): Promise<void> {
  await db.query(LEDGER_SQL, [a.branchId, a.productId, a.kind, a.deltaOnHand, a.deltaReserved, a.ref]);
  const prevAvailable = a.after.on_hand - a.deltaOnHand - (a.after.reserved - a.deltaReserved) - a.after.buffer;
  await enqueue(db, 'inventory', `${a.branchId}:${a.productId}`, 'inventory.changed', {
    branch_id: a.branchId,
    product_id: a.productId,
    on_hand: a.after.on_hand,
    reserved: a.after.reserved,
    buffer: a.after.buffer,
    rev: a.after.rev,
    prev_available: prevAvailable,
  });
}

/** Lock the row, compute the new numbers from the current ones, apply, and record. Returns both versions. */
export async function changeStock(
  db: Db,
  branchId: number,
  productId: number,
  kind: LedgerKind,
  ref: string | null,
  next: (cur: StockRow) => { on_hand: number; reserved: number },
): Promise<{ before: StockRow; after: StockRow }> {
  const before = await lockStock(db, branchId, productId);
  const n = next(before);
  const r = await db.query<StockRow>(SET_STOCK_SQL, [branchId, productId, n.on_hand, n.reserved]);
  const after = r.rows[0];
  if (!after) throw new AppError(404, 'NOT_FOUND', `No stock row for branch ${branchId} and product ${productId}`);
  await recordChange(db, {
    branchId,
    productId,
    after,
    kind,
    deltaOnHand: n.on_hand - before.on_hand,
    deltaReserved: n.reserved - before.reserved,
    ref,
  });
  return { before, after };
}
