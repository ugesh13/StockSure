import type { Db } from '../db.ts';
import { getPool } from '../db.ts';
import { notFound } from '../errors.ts';
import {
  CART_ITEMS_SQL,
  CART_VIEW_SQL,
  CLEAR_CART_SQL,
  DELETE_ITEM_SQL,
  ENSURE_CART_SQL,
  SET_ITEM_QTY_SQL,
  STOCK_EXISTS_SQL,
  UPSERT_ITEM_SQL,
} from '../sql.ts';

// Carts live in Postgres. Adding to a cart never holds stock: the guarantee comes at checkout.

export type CartItem = { product_id: number; branch_id: number; qty: number };

export type CartLineView = {
  product_id: number;
  name: string;
  brand: string;
  price_paise: number;
  image_url: string | null;
  branch_id: number;
  branch_name: string;
  city: string;
  qty: number;
  available: number;
  ok: boolean; // false when the branch cannot cover qty right now (checkout would fail)
};

export async function ensureCart(db: Db, customerId: number): Promise<number> {
  const r = await db.query<{ id: number }>(ENSURE_CART_SQL, [customerId]);
  const id = r.rows[0]?.id;
  if (id === undefined) throw new Error('cart upsert returned no row');
  return id;
}

export async function cartItems(db: Db, cartId: number): Promise<CartItem[]> {
  return (await db.query<CartItem>(CART_ITEMS_SQL, [cartId])).rows;
}

export async function upsertItem(db: Db, cartId: number, productId: number, branchId: number, qty: number): Promise<void> {
  await db.query(UPSERT_ITEM_SQL, [cartId, productId, branchId, qty]);
}

export async function deleteItem(db: Db, cartId: number, productId: number, branchId: number): Promise<number> {
  const r = await db.query(DELETE_ITEM_SQL, [cartId, productId, branchId]);
  return r.rowCount ?? 0;
}

export async function getCart(customerId: number): Promise<{ lines: CartLineView[]; total_paise: number; item_count: number }> {
  const r = await getPool().query<Omit<CartLineView, 'ok'>>(CART_VIEW_SQL, [customerId]);
  const lines = r.rows.map((l) => ({ ...l, ok: l.available >= l.qty }));
  return {
    lines,
    total_paise: lines.reduce((s, l) => s + l.price_paise * l.qty, 0),
    item_count: lines.reduce((s, l) => s + l.qty, 0),
  };
}

export async function addToCart(customerId: number, productId: number, branchId: number, qty: number): Promise<void> {
  const pool = getPool();
  const exists = await pool.query(STOCK_EXISTS_SQL, [branchId, productId]);
  if (exists.rows.length === 0) throw notFound('That product at that branch');
  const cartId = await ensureCart(pool, customerId);
  await upsertItem(pool, cartId, productId, branchId, qty);
}

export async function setQty(customerId: number, productId: number, branchId: number, qty: number): Promise<void> {
  const pool = getPool();
  const cartId = await ensureCart(pool, customerId);
  const r = await pool.query(SET_ITEM_QTY_SQL, [cartId, productId, branchId, qty]);
  if ((r.rowCount ?? 0) === 0) throw notFound('Cart item');
}

export async function removeItem(customerId: number, productId: number, branchId: number): Promise<void> {
  const pool = getPool();
  const cartId = await ensureCart(pool, customerId);
  if ((await deleteItem(pool, cartId, productId, branchId)) === 0) throw notFound('Cart item');
}

export async function clearCart(customerId: number): Promise<void> {
  await getPool().query(CLEAR_CART_SQL, [customerId]);
}
