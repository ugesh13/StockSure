import type { PoolClient } from 'pg';
import { cfg } from '../config.ts';
import { TxAbort, withTx } from '../db.ts';
import type { Db } from '../db.ts';
import { sortLines } from '../domain/lines.ts';
import type { StockLine } from '../domain/lines.ts';
import { AppError, notFound } from '../errors.ts';
import { enqueue } from '../events.ts';
import {
  CART_LINES_SQL,
  CLEAR_CART_SQL,
  EXPIRED_NEXT_SQL,
  INSERT_LINES_SQL,
  INSERT_ORDER_SQL,
  LEAVE_AWAITING_SQL,
  LOAD_ORDER_LINES_SQL,
  LOAD_ORDER_SQL,
  ORDER_BY_KEY_SQL,
  ORDER_LINES_FOR_STOCK_SQL,
  ORDER_STATUS_LOCK_SQL,
  ORDER_STATUS_SQL,
  PAY_SQL,
  PENDING_ORDERS_SQL,
  RESERVE_SQL,
} from '../sql.ts';
import { changeStock, recordChange } from './stock.ts';
import type { StockRow } from './stock.ts';

export type Fulfilment = 'PICKUP' | 'DELIVERY' | 'IN_STORE';
export type PricedLine = StockLine & {
  unit_price_paise: number;
  name?: string;
  branch_name?: string;
};

export type OrderLineView = {
  product_id: number;
  name: string;
  branch_id: number;
  branch_name: string;
  city: string;
  qty: number;
  unit_price_paise: number;
};

export type OrderView = {
  id: string;
  customer_id: number;
  status: string;
  total_paise: number;
  fulfilment: string;
  expires_at: string | null;
  created_at: string;
  paid_at: string | null;
  finalized_at: string | null;
  lines: OrderLineView[];
};

export type CheckoutResult =
  | { ok: true; replay: boolean; order: OrderView }
  | { ok: false; failed: PricedLine[]; lines: PricedLine[] };

export async function loadOrder(db: Db, orderId: string): Promise<OrderView | null> {
  const o = await db.query<Omit<OrderView, 'lines'>>(LOAD_ORDER_SQL, [orderId]);
  const row = o.rows[0];
  if (!row) return null;
  const l = await db.query<OrderLineView>(LOAD_ORDER_LINES_SQL, [orderId]);
  return { ...row, lines: l.rows };
}

/**
 * Release the stock held by an unpaid order and move it to a final state.
 * Used by expiry, cancel, and the conflict check. Returns null if the order was not awaiting payment.
 */
export async function releaseHold(
  c: PoolClient,
  orderId: string,
  to: 'EXPIRED' | 'CANCELLED' | 'NEEDS_RESCUE',
): Promise<{ customerId: number; lines: StockLine[] } | null> {
  const moved = await c.query<{ id: string; customer_id: number }>(LEAVE_AWAITING_SQL, [orderId, to]);
  const order = moved.rows[0];
  if (!order) return null;
  const lines = (await c.query<StockLine>(ORDER_LINES_FOR_STOCK_SQL, [orderId])).rows; // already sorted by branch, product
  for (const l of lines) {
    await changeStock(c, l.branch_id, l.product_id, 'RELEASE', orderId, (cur) => ({
      on_hand: cur.on_hand,
      reserved: Math.max(cur.reserved - l.qty, 0),
    }));
  }
  return { customerId: order.customer_id, lines };
}

/**
 * Checkout: the guarded reserve. Everything below happens in ONE transaction.
 *  1. Insert the order first. A repeated Idempotency-Key conflicts and returns the existing order.
 *  2. Cancel this shopper's older unpaid hold (one open checkout at a time).
 *  3. Reserve each line (sorted by branch, product) with the single guarded UPDATE. 0 rows = that line failed.
 *  4. Any failed line: roll everything back and report the failed lines (the caller builds the Rescue Ladder).
 *  5. All good: insert lines. Ledger and outbox rows were written per line. Commit.
 */
export type CheckoutExtras = {
  /** Added to the order total, e.g. the delivery fee. Charged with the goods, so the payment amount is right. */
  extraPaise?: number;
  /** Runs inside the checkout transaction after the order is reserved, e.g. to write the delivery record atomically. */
  afterReserve?: (c: PoolClient, orderId: string) => Promise<void>;
};

export async function checkout(
  customerId: number,
  idempotencyKey: string,
  fulfilment: Fulfilment,
  branchId?: number,
  extras: CheckoutExtras = {},
): Promise<CheckoutResult> {
  try {
    return await withTx(async (c): Promise<CheckoutResult> => {
      // A retry of a request that already created an order must return that order, even after payment emptied the cart.
      const prior = await c.query<{ id: string }>(ORDER_BY_KEY_SQL, [customerId, idempotencyKey]);
      const priorId = prior.rows[0]?.id;
      if (priorId) {
        const existing = await loadOrder(c, priorId);
        if (existing) return { ok: true, replay: true, order: existing };
      }

      const cart = await c.query<PricedLine>(CART_LINES_SQL, [customerId]);
      if (cart.rows.length === 0) throw new AppError(400, 'EMPTY_CART', 'Your cart is empty.');
      const lines = sortLines(cart.rows);
      const total = lines.reduce((sum, l) => sum + l.unit_price_paise * l.qty, 0) + (extras.extraPaise ?? 0);

      if (fulfilment === 'IN_STORE') {
        if (!branchId) throw new AppError(400, 'BAD_INPUT', 'branch_id is required for IN_STORE fulfilment');
        const wrong = lines.filter((l) => l.branch_id !== branchId);
        if (wrong.length > 0) {
          throw new AppError(409, 'WRONG_BRANCH', 'All cart lines must be at the chosen in-store branch.', {
            wrong: wrong.map((w) => ({
              product_id: w.product_id,
              name: w.name,
              branch_id: w.branch_id,
              branch_name: w.branch_name,
            })),
          });
        }
      }

      const inserted = await c.query<{ id: string }>(INSERT_ORDER_SQL, [customerId, total, fulfilment, idempotencyKey, cfg().HOLD_MINUTES, branchId ?? null]);
      const created = inserted.rows[0];
      if (!created) {
        // Same Idempotency-Key as an earlier request: return that order, never a second one.
        const existing = await c.query<{ id: string }>(ORDER_BY_KEY_SQL, [customerId, idempotencyKey]);
        const id = existing.rows[0]?.id;
        const order = id ? await loadOrder(c, id) : null;
        if (!order) throw new AppError(409, 'IDEMPOTENCY_CONFLICT', 'That Idempotency-Key is being processed. Retry shortly.');
        return { ok: true, replay: true, order };
      }
      const orderId = created.id;

      const older = await c.query<{ id: string }>(PENDING_ORDERS_SQL, [customerId, orderId]);
      for (const o of older.rows) await releaseHold(c, o.id, 'CANCELLED');

      const failed: PricedLine[] = [];
      for (const l of lines) {
        const r = await c.query<StockRow>(RESERVE_SQL, [l.branch_id, l.product_id, l.qty]);
        const after = r.rows[0];
        if (!after) {
          failed.push(l);
          continue;
        }
        await recordChange(c, { branchId: l.branch_id, productId: l.product_id, after, kind: 'HOLD', deltaOnHand: 0, deltaReserved: l.qty, ref: orderId });
      }
      if (failed.length > 0) throw new TxAbort({ failed, lines });

      await c.query(INSERT_LINES_SQL, [
        orderId,
        lines.map((l) => l.product_id),
        lines.map((l) => l.branch_id),
        lines.map((l) => l.qty),
        lines.map((l) => l.unit_price_paise),
      ]);
      if (extras.afterReserve) await extras.afterReserve(c, orderId);
      const order = await loadOrder(c, orderId);
      if (!order) throw new Error('order vanished inside its own transaction');
      return { ok: true, replay: false, order };
    });
  } catch (e) {
    if (e instanceof TxAbort) return { ok: false, ...(e.value as { failed: PricedLine[]; lines: PricedLine[] }) };
    throw e;
  }
}

/** Mock payment. Places the order and writes order.placed to the outbox. The HTTP answer never waits for Kafka. */
export async function payOrder(customerId: number, orderId: string): Promise<{ order: OrderView; replay: boolean }> {
  return withTx(async (c) => {
    const paid = await c.query<{ id: string }>(PAY_SQL, [orderId, customerId]);
    if (paid.rows.length === 0) {
      const cur = await c.query<{ status: string }>(ORDER_STATUS_SQL, [orderId, customerId]);
      const status = cur.rows[0]?.status;
      if (!status) throw notFound('Order');
      if (status === 'PLACED') {
        const order = await loadOrder(c, orderId);
        if (!order) throw notFound('Order');
        return { order, replay: true };
      }
      throw new AppError(410, 'HOLD_EXPIRED', 'Your hold expired. Please check out again.', { status });
    }
    const lines = (await c.query<StockLine>(ORDER_LINES_FOR_STOCK_SQL, [orderId])).rows;
    await enqueue(c, 'orders', orderId, 'order.placed', { order_id: orderId, customer_id: customerId, lines });
    await c.query(CLEAR_CART_SQL, [customerId]);
    await c.query(`UPDATE deliveries SET status = 'CONFIRMED' WHERE order_id = $1 AND status = 'PENDING_PAYMENT'`, [orderId]);
    const order = await loadOrder(c, orderId);
    if (!order) throw notFound('Order');
    return { order, replay: false };
  });
}

export async function getOrder(customerId: number, orderId: string, db: Db): Promise<OrderView> {
  const order = await loadOrder(db, orderId);
  if (!order || order.customer_id !== customerId) throw notFound('Order');
  return order;
}

export async function listOrders(
  customerId: number,
  options: { limit?: number; before?: string },
  db: Db,
): Promise<{ orders: OrderView[]; next_before: string | null }> {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);
  const before = options.before?.trim() ? options.before.trim() : null;

  const ordersRes = await db.query<Omit<OrderView, 'lines'>>(
    `SELECT id, customer_id, status, total_paise, fulfilment, expires_at, created_at, paid_at, finalized_at
       FROM orders
      WHERE customer_id = $1
        AND ($2::timestamptz IS NULL OR created_at < $2::timestamptz)
      ORDER BY created_at DESC
      LIMIT $3`,
    [customerId, before, limit],
  );

  const orderRows = ordersRes.rows;
  if (orderRows.length === 0) {
    return { orders: [], next_before: null };
  }

  const orderIds = orderRows.map((o) => o.id);
  const linesRes = await db.query<OrderLineView & { order_id: string }>(
    `SELECT l.order_id, l.product_id, p.name, l.branch_id, b.name AS branch_name, b.city, l.qty, l.unit_price_paise
       FROM order_lines l
       JOIN products p ON p.id = l.product_id
       JOIN branches b ON b.id = l.branch_id
      WHERE l.order_id = ANY($1::uuid[])
      ORDER BY l.product_id`,
    [orderIds],
  );

  const linesByOrder = new Map<string, OrderLineView[]>();
  for (const row of linesRes.rows) {
    const { order_id, ...line } = row;
    const existing = linesByOrder.get(order_id);
    if (existing) existing.push(line);
    else linesByOrder.set(order_id, [line]);
  }

  const orders: OrderView[] = orderRows.map((o) => ({
    ...o,
    lines: linesByOrder.get(o.id) ?? [],
  }));

  const last = orders[orders.length - 1];
  const next_before = orders.length === limit && last ? new Date(last.created_at).toISOString() : null;

  return { orders, next_before };
}

/** The shopper gives up an unpaid hold: stock returns to sale at once. */
export async function cancelOrder(customerId: number, orderId: string): Promise<OrderView> {
  return withTx(async (c) => {
    const cur = await c.query<{ status: string }>(ORDER_STATUS_LOCK_SQL, [orderId, customerId]);
    const status = cur.rows[0]?.status;
    if (!status) throw notFound('Order');
    if (status === 'PLACED') throw new AppError(409, 'ALREADY_PLACED', 'A paid order cannot be cancelled here.');
    if (status === 'AWAITING_PAYMENT') await releaseHold(c, orderId, 'CANCELLED');
    const order = await loadOrder(c, orderId);
    if (!order) throw notFound('Order');
    return order;
  });
}

/** Expire unpaid orders past their hold (one transaction per order). Returns how many were expired. */
export async function sweepOnce(max = 50): Promise<number> {
  let count = 0;
  while (count < max) {
    const didOne = await withTx(async (c) => {
      const next = await c.query<{ id: string }>(EXPIRED_NEXT_SQL);
      const id = next.rows[0]?.id;
      if (!id) return false;
      const released = await releaseHold(c, id, 'EXPIRED');
      if (released && released.lines.length > 0) {
        await enqueue(c, 'orders', id, 'order.expired', { order_id: id, customer_id: released.customerId, lines: released.lines });
      }
      return true;
    });
    if (!didOne) break;
    count++;
  }
  return count;
}
