import type { PoolClient } from 'pg';
import type { Db } from '../db.ts';
import { getPool } from '../db.ts';
import { mergeByProduct } from '../domain/lines.ts';
import type { StockLine } from '../domain/lines.ts';
import { planSplit } from '../domain/rescue.ts';
import type { BranchStock, SplitAssignment } from '../domain/rescue.ts';
import { AppError, notFound } from '../errors.ts';
import {
  BRANCH_CITY_SQL,
  BRANCH_STOCK_SQL,
  EQUIVALENTS_SQL,
  FAILED_DETAIL_SQL,
  ONE_BRANCH_SQL,
  ORDER_LINES_FOR_STOCK_SQL,
  ORDER_STATUS_LOCK_SQL,
} from '../sql.ts';
import { cartItems, deleteItem, ensureCart, upsertItem } from './cart.ts';
import type { PricedLine } from './orders.ts';

// The Rescue Ladder. Computed from Postgres (search is only a hint). When checkout returns 409 the shopper gets the
// first options that work, in this order: swap an equivalent, one branch for the whole cart, split across branches,
// back-in-stock alert. Applying an option rewrites the cart and runs the normal checkout again, so a rescue passes
// through the same guard and can never oversell.

export type RescueOption =
  | {
      type: 'SWAP';
      line: StockLine;
      candidates: { product_id: number; name: string; price_paise: number; branch_id: number; available: number }[];
    }
  | { type: 'ONE_BRANCH'; branch_id: number; branch_name: string; city: string }
  | { type: 'SPLIT'; assignments: SplitAssignment[] }
  | { type: 'BACK_IN_STOCK'; lines: StockLine[] };

export type RescueChoice =
  | { type: 'SWAP'; from: { product_id: number; branch_id: number }; to: { product_id: number; branch_id: number } }
  | { type: 'ONE_BRANCH'; branch_id: number }
  | { type: 'SPLIT'; assignments: SplitAssignment[] };

export type FailureDetails = {
  failed: { product_id: number; branch_id: number; name: string; qty: number; available: number }[];
  rescue: RescueOption[];
};

type Candidate = { product_id: number; name: string; price_paise: number; branch_id: number; available: number };

export async function buildRescue(db: Db, failed: PricedLine[], all: PricedLine[], shopperCity: string | null): Promise<RescueOption[]> {
  const options: RescueOption[] = [];
  const first = failed[0];
  if (!first) return options;

  let city = shopperCity;
  if (!city) {
    const r = await db.query<{ city: string }>(BRANCH_CITY_SQL, [first.branch_id]);
    city = r.rows[0]?.city ?? null;
  }

  // 1. Swap an equivalent (same category, price within +-15%, available at the same branch, closest price first)
  for (const line of failed) {
    const r = await db.query<Candidate>(EQUIVALENTS_SQL, [line.product_id, line.branch_id, line.unit_price_paise, line.qty]);
    if (r.rows.length > 0) {
      options.push({ type: 'SWAP', line: { branch_id: line.branch_id, product_id: line.product_id, qty: line.qty }, candidates: r.rows });
    }
  }

  // 2. One branch for the whole cart (prefers the shopper's city)
  const merged = mergeByProduct(all);
  const one = await db.query<{ branch_id: number; branch_name: string; city: string }>(ONE_BRANCH_SQL, [
    merged.map((m) => m.product_id),
    merged.map((m) => m.qty),
    city ?? '',
  ]);
  for (const b of one.rows) options.push({ type: 'ONE_BRANCH', branch_id: b.branch_id, branch_name: b.branch_name, city: b.city });

  // 3. Split across branches (fewest shipments)
  const stock = await db.query<BranchStock>(BRANCH_STOCK_SQL, [failed.map((f) => f.product_id)]);
  const failedKeys = new Set(failed.map((f) => `${f.branch_id}:${f.product_id}`));
  const keep = [...new Set(all.filter((l) => !failedKeys.has(`${l.branch_id}:${l.product_id}`)).map((l) => l.branch_id))];
  const plan = planSplit(failed, stock.rows, keep, city);
  if (plan && plan.length > 0) options.push({ type: 'SPLIT', assignments: plan });

  // 4. Back-in-stock alert (always possible)
  options.push({ type: 'BACK_IN_STOCK', lines: failed.map((f) => ({ branch_id: f.branch_id, product_id: f.product_id, qty: f.qty })) });
  return options;
}

export async function describeFailure(failed: PricedLine[], all: PricedLine[], shopperCity: string | null): Promise<FailureDetails> {
  const db = getPool();
  const detail = await db.query<{ product_id: number; branch_id: number; name: string; available: number }>(FAILED_DETAIL_SQL, [
    failed.map((f) => f.product_id),
    failed.map((f) => f.branch_id),
  ]);
  const byKey = new Map(detail.rows.map((d) => [`${d.branch_id}:${d.product_id}`, d]));
  return {
    failed: failed.map((f) => {
      const d = byKey.get(`${f.branch_id}:${f.product_id}`);
      return { product_id: f.product_id, branch_id: f.branch_id, name: d?.name ?? '', qty: f.qty, available: d?.available ?? 0 };
    }),
    rescue: await buildRescue(db, failed, all, shopperCity),
  };
}

/**
 * Options for an order that was released (NEEDS_RESCUE): the failed lines are the ones the branch cannot cover right now.
 * If every line is available again the shopper can simply check out again, so no options are returned.
 */
export async function rescueForOrder(lines: PricedLine[], shopperCity: string | null): Promise<FailureDetails & { can_retry_checkout: boolean }> {
  const detail = await getPool().query<{ product_id: number; branch_id: number; available: number }>(FAILED_DETAIL_SQL, [
    lines.map((l) => l.product_id),
    lines.map((l) => l.branch_id),
  ]);
  const avail = new Map(detail.rows.map((d) => [`${d.branch_id}:${d.product_id}`, d.available]));
  const failed = lines.filter((l) => (avail.get(`${l.branch_id}:${l.product_id}`) ?? 0) < l.qty);
  if (failed.length === 0) return { failed: [], rescue: [], can_retry_checkout: true };
  return { ...(await describeFailure(failed, lines, shopperCity)), can_retry_checkout: false };
}

/**
 * Apply a chosen option to the cart (inside the caller's transaction). The caller then runs checkout again.
 * orderId is for a NEEDS_RESCUE order: its lines are restored into the cart first.
 */
export async function applyRescueToCart(c: PoolClient, customerId: number, choice: RescueChoice, orderId?: string): Promise<void> {
  const cartId = await ensureCart(c, customerId);

  if (orderId) {
    const st = await c.query<{ status: string }>(ORDER_STATUS_LOCK_SQL, [orderId, customerId]);
    const status = st.rows[0]?.status;
    if (!status) throw notFound('Order');
    if (status !== 'NEEDS_RESCUE') throw new AppError(409, 'NOT_RESCUABLE', `Order is ${status}, not NEEDS_RESCUE.`);
    const lines = (await c.query<StockLine>(ORDER_LINES_FOR_STOCK_SQL, [orderId])).rows;
    for (const it of await cartItems(c, cartId)) await deleteItem(c, cartId, it.product_id, it.branch_id);
    for (const l of lines) await upsertItem(c, cartId, l.product_id, l.branch_id, l.qty);
  }

  const items = await cartItems(c, cartId);
  const find = (productId: number, branchId: number) => items.find((i) => i.product_id === productId && i.branch_id === branchId);

  if (choice.type === 'SWAP') {
    const line = find(choice.from.product_id, choice.from.branch_id);
    if (!line) throw notFound('The cart line to swap');
    await deleteItem(c, cartId, line.product_id, line.branch_id);
    await upsertItem(c, cartId, choice.to.product_id, choice.to.branch_id, line.qty);
    return;
  }

  if (choice.type === 'ONE_BRANCH') {
    const merged = mergeByProduct(items);
    for (const it of items) await deleteItem(c, cartId, it.product_id, it.branch_id);
    for (const m of merged) await upsertItem(c, cartId, m.product_id, choice.branch_id, Math.min(m.qty, 10));
    return;
  }

  for (const a of choice.assignments) {
    const line = find(a.product_id, a.from_branch_id);
    if (!line || line.qty < a.qty) throw notFound('The cart line to split');
    await deleteItem(c, cartId, line.product_id, line.branch_id);
    if (line.qty > a.qty) await upsertItem(c, cartId, line.product_id, line.branch_id, line.qty - a.qty);
    await upsertItem(c, cartId, a.product_id, a.to_branch_id, a.qty);
  }
}
