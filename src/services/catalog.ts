import { cfg } from '../config.ts';
import { getPool } from '../db.ts';
import { displayStatus, isStale, stockStatus } from '../domain/availability.ts';
import type { DisplayStatus } from '../domain/availability.ts';
import { notFound } from '../errors.ts';
import { BRANCHES_SQL, CATEGORIES_SQL, PRODUCTS_COUNT_SQL, PRODUCTS_LIST_SQL, PRODUCT_BRANCHES_SQL, PRODUCT_SQL } from '../sql.ts';

export type BranchBeat = { id: number; name: string; city: string; lat: number | null; lng: number | null; last_heartbeat_at: string };

let beatCache: { at: number; map: Map<number, BranchBeat> } | undefined;

/** Branch heartbeats (3 rows), cached for 3 seconds. Used by the freshness rule on every search and product page. */
export async function getBranchBeats(): Promise<Map<number, BranchBeat>> {
  if (beatCache && Date.now() - beatCache.at < 3000) return beatCache.map;
  const r = await getPool().query<BranchBeat>(BRANCHES_SQL);
  const map = new Map(r.rows.map((b) => [b.id, b]));
  beatCache = { at: Date.now(), map };
  return map;
}

export function branchStatus(available: number, beat: BranchBeat | undefined): DisplayStatus {
  const stale = isStale(beat?.last_heartbeat_at, Date.now(), cfg().STALE_SECONDS);
  return displayStatus(stockStatus(available, cfg().LOW_STOCK), stale);
}

export type ProductRow = {
  id: number;
  sku: string;
  name: string;
  brand: string;
  category: string;
  tags: string[];
  price_paise: number;
  image_url: string | null;
};

export async function listProducts(p: { category?: string; city?: string; page: number; pageSize: number }) {
  const db = getPool();
  const [rows, count] = await Promise.all([
    db.query<ProductRow & { available_total: number }>(PRODUCTS_LIST_SQL, [p.category ?? null, p.city ?? null, p.pageSize, (p.page - 1) * p.pageSize]),
    db.query<{ n: number }>(PRODUCTS_COUNT_SQL, [p.category ?? null]),
  ]);
  return { page: p.page, page_size: p.pageSize, total: count.rows[0]?.n ?? 0, products: rows.rows };
}

export async function getProduct(id: number) {
  const db = getPool();
  const [p, branches, beats] = await Promise.all([
    db.query<ProductRow>(PRODUCT_SQL, [id]),
    db.query<{ branch_id: number; branch_name: string; city: string; available: number }>(PRODUCT_BRANCHES_SQL, [id]),
    getBranchBeats(),
  ]);
  const product = p.rows[0];
  if (!product) throw notFound('Product');
  return {
    ...product,
    branches: branches.rows.map((b) => ({
      ...b,
      available: Math.max(b.available, 0),
      status: branchStatus(b.available, beats.get(b.branch_id)),
    })),
  };
}

let categoryCache: { at: number; value: { category: string; products: number }[] } | undefined;

/** The category list changes rarely: cached in memory for 60 seconds. */
export async function listCategories() {
  if (categoryCache && Date.now() - categoryCache.at < 60_000) return categoryCache.value;
  const r = await getPool().query<{ category: string; products: number }>(CATEGORIES_SQL);
  categoryCache = { at: Date.now(), value: r.rows };
  return r.rows;
}

export async function listBranches() {
  const beats = await getBranchBeats();
  return [...beats.values()].map((b) => ({
    id: b.id,
    name: b.name,
    city: b.city,
    lat: b.lat,
    lng: b.lng,
    last_heartbeat_at: b.last_heartbeat_at,
    stock_confirmed: !isStale(b.last_heartbeat_at, Date.now(), cfg().STALE_SECONDS),
  }));
}
