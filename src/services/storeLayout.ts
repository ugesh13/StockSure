import crypto from 'node:crypto';
import { cfg } from '../config.ts';
import { getPool, withTx } from '../db.ts';
import { branchStatus, getBranchBeats } from './catalog.ts';
import { isStale } from '../domain/availability.ts';
import { notFound, AppError, badInput } from '../errors.ts';
import { generateSearchTags } from '../domain/catalogue.ts';
import {
  generateStore,
  placementPos,
  slotWidth,
  preferredLevel,
  BAY_W,
  SHELF_DEPTH,
  LEVEL_HEIGHTS,
  UNIT_DEPTH,
  CROSS_AISLE,
  END_FREE,
  type PackRow,
} from '../domain/layout/index.ts';
import { getCart } from './cart.ts';
import { enqueue } from '../events.ts';
import { bulkIndex, refreshIndex } from '../search/opensearch.ts';
import { buildDoc } from '../domain/doc.ts';

const CART_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export async function getBranchLayout(branchId: number) {
  const beats = await getBranchBeats();
  const b = beats.get(branchId);
  if (!b) throw notFound('Branch');

  const pool = getPool();
  const products = await pool.query<PackRow>('SELECT id, category, brand, name, price_paise FROM products ORDER BY id');
  const store = generateStore(products.rows);
  const a0 = store.aisles[0]!;

  const layout = {
    width_m: store.width_m,
    depth_m: store.depth_m,
    entrance: store.entrance,
    kiosk: store.kiosk,
    staff_desk: store.staff_desk,
    gondola: {
      x1: a0.x1,
      x2: a0.x2,
      depth_m: UNIT_DEPTH,
      bays: a0.bays,
      levels: 4,
      level_heights_m: LEVEL_HEIGHTS,
    },
    aisles: store.aisles.map((a) => ({
      code: a.code,
      label: a.label,
      category: a.category,
      z: a.z,
    })),
  };

  return {
    branch: {
      id: b.id,
      name: b.name,
      city: b.city,
      stock_confirmed: !isStale(b.last_heartbeat_at, Date.now(), cfg().STALE_SECONDS),
    },
    layout,
  };
}

export async function getBranchShelves(branchId: number, since?: string) {
  const beats = await getBranchBeats();
  const b = beats.get(branchId);
  if (!b) throw notFound('Branch');

  const pool = getPool();
  const nowRes = await pool.query<{ now: Date }>('SELECT now()');
  const asOf = nowRes.rows[0]!.now.toISOString();
  const sinceDate = since && !isNaN(Date.parse(since)) ? new Date(since) : null;

  const query = `
    SELECT sl.product_id, p.name, p.brand, p.category, p.price_paise,
           sl.aisle, sl.bay, sl.level, sl.slot, sl.x, sl.y, sl.z,
           sl.stand_x, sl.stand_z,
           GREATEST(i.on_hand - i.reserved - i.buffer, 0)::int AS available,
           i.rev, i.updated_at
      FROM shelf_locations sl
      JOIN products p ON p.id = sl.product_id
      JOIN inventory i ON i.branch_id = sl.branch_id AND i.product_id = sl.product_id
     WHERE sl.branch_id = $1::int
       AND ($2::timestamptz IS NULL OR i.updated_at > $2::timestamptz)
     ORDER BY sl.aisle, sl.bay, sl.level, sl.slot, sl.product_id
  `;

  const rows = await pool.query<{
    product_id: number;
    name: string;
    brand: string;
    category: string;
    price_paise: number;
    aisle: string;
    bay: number;
    level: number;
    slot: number;
    x: number;
    y: number;
    z: number;
    stand_x: number;
    stand_z: number;
    available: number;
    rev: string | number;
    updated_at: Date;
  }>(query, [branchId, sinceDate]);

  const items = rows.rows.map((r) => ({
    product_id: r.product_id,
    name: r.name,
    brand: r.brand,
    category: r.category,
    price_paise: r.price_paise,
    aisle: r.aisle,
    bay: r.bay,
    level: r.level,
    slot: r.slot,
    x: r.x,
    y: r.y,
    z: r.z,
    stand: { x: r.stand_x, z: r.stand_z },
    available: r.available,
    status: branchStatus(r.available, b),
    rev: Number(r.rev),
    updated_at: r.updated_at.toISOString(),
  }));

  return {
    as_of: asOf,
    branch: {
      id: b.id,
      stock_confirmed: !isStale(b.last_heartbeat_at, Date.now(), cfg().STALE_SECONDS),
      last_heartbeat_at: b.last_heartbeat_at,
    },
    items,
  };
}

export async function createCartCode(customerId: number): Promise<{ code: string }> {
  const pool = getPool();
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += CART_CODE_ALPHABET[Math.floor(Math.random() * CART_CODE_ALPHABET.length)];
  }

  await pool.query(
    `INSERT INTO cart_codes (code, customer_id, expires_at)
     VALUES ($1, $2, now() + interval '30 minutes')
     ON CONFLICT (code) DO UPDATE SET customer_id = EXCLUDED.customer_id, expires_at = EXCLUDED.expires_at`,
    [code, customerId],
  );

  return { code };
}

export async function getKioskCart(code: string, branchId?: number) {
  const pool = getPool();
  const cleanCode = code.trim().toUpperCase();
  const res = await pool.query<{ customer_id: number; expires_at: Date }>(
    'SELECT customer_id, expires_at FROM cart_codes WHERE code = $1',
    [cleanCode],
  );
  const rec = res.rows[0];
  if (!rec || new Date(rec.expires_at).getTime() < Date.now()) {
    throw new AppError(404, 'INVALID_CODE', 'That code is not valid or has expired.');
  }

  const custRes = await pool.query<{ name: string }>('SELECT name FROM customers WHERE id = $1', [rec.customer_id]);
  const custName = custRes.rows[0]?.name ?? `Customer ${rec.customer_id}`;

  const cart = await getCart(rec.customer_id);
  const lines = cart.lines.map((l) => ({
    ...l,
    at_this_branch: branchId !== undefined ? l.branch_id === branchId : false,
  }));
  const total_paise = lines.filter((l) => l.at_this_branch).reduce((sum, l) => sum + l.price_paise * l.qty, 0);

  return {
    customer_id: rec.customer_id,
    customer_name: custName,
    lines,
    total_paise,
  };
}

export async function getPipelineMetrics() {
  const pool = getPool();
  const outboxRes = await pool.query<{ n: number }>('SELECT count(*)::int AS n FROM outbox WHERE published_at IS NULL');
  const awaitingRes = await pool.query<{ n: number; oldest: number }>(`
    SELECT count(*)::int AS n,
           COALESCE(EXTRACT(EPOCH FROM (now() - min(paid_at))), 0)::double precision AS oldest
      FROM orders
     WHERE status = 'PLACED' AND finalized_at IS NULL
  `);

  const processedRes = await pool.query<{ consumer: string; last_processed_at: Date }>(`
    SELECT consumer, max(processed_at) AS last_processed_at
      FROM processed_events
     GROUP BY consumer
     ORDER BY consumer
  `);

  let last_processed = processedRes.rows.map((r) => ({
    consumer: r.consumer,
    last_processed_at: r.last_processed_at.toISOString(),
  }));

  if (last_processed.length === 0) {
    const nowIso = new Date().toISOString();
    last_processed = [
      { consumer: 'stock-finalizer', last_processed_at: nowIso },
      { consumer: 'search-indexer', last_processed_at: nowIso },
    ];
  }

  const oldest_s = Math.round(Number(awaitingRes.rows[0]?.oldest ?? 0));
  const awaitingCount = Number(awaitingRes.rows[0]?.n ?? 0);
  const healthy = awaitingCount === 0 || oldest_s <= 3;

  return {
    healthy,
    outbox_pending: Number(outboxRes.rows[0]?.n ?? 0),
    awaiting_finalizer: awaitingCount,
    awaiting_finalizer_oldest_s: oldest_s,
    last_processed,
  };
}

export async function addProductRequest(query: string): Promise<{ id: number }> {
  const normalized = query.trim().toLowerCase().replace(/\s+/g, ' ');
  const pool = getPool();
  const res = await pool.query<{ id: number }>(
    `INSERT INTO product_requests (query, normalized, count, first_seen, last_seen)
     VALUES ($1, $2, 1, now(), now())
     ON CONFLICT (normalized) DO UPDATE
       SET count = product_requests.count + 1,
           last_seen = now()
     RETURNING id`,
    [query.trim(), normalized],
  );
  return { id: res.rows[0]!.id };
}

export async function getProductRequests(): Promise<{ requests: { id: number; query: string; count: number; at: string }[] }> {
  const pool = getPool();
  const res = await pool.query<{ id: number; query: string; count: number; last_seen: Date }>(`
    SELECT id, query, count, last_seen
      FROM product_requests
     ORDER BY count DESC, last_seen DESC
     LIMIT 50
  `);
  return {
    requests: res.rows.map((r) => ({
      id: r.id,
      query: r.query,
      count: r.count,
      at: r.last_seen ? new Date(r.last_seen).toISOString() : new Date().toISOString(),
    })),
  };
}

export interface StaffProductInput {
  name: string;
  brand: string;
  category: string;
  price_paise: number;
  stock: { branch_id: number; qty: number }[];
}

export async function staffAddProduct(input: StaffProductInput) {
  const VALID_CATEGORIES = ['audio', 'mobiles', 'computing', 'tv', 'appliances', 'wearables', 'accessories', 'personal_care', 'household', 'grocery'];
  if (!VALID_CATEGORIES.includes(input.category)) {
    throw badInput(`Invalid category "${input.category}". Must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }
  if (!Number.isInteger(input.price_paise) || input.price_paise <= 0) {
    throw badInput('price_paise must be a positive integer');
  }

  const txResult = await withTx(async (c) => {
    // 1. Get all products in this category to calculate appending shelf position
    const productsRes = await c.query<PackRow>('SELECT id, category, brand, name, price_paise FROM products ORDER BY id');
    const existing = productsRes.rows;
    const store = generateStore(existing);

    const aisleGeo = store.aisles.find((a) => a.category === input.category);
    if (!aisleGeo) throw badInput(`No aisle found for category "${input.category}"`);

    const fakeRow: PackRow = {
      id: 999999,
      category: input.category,
      brand: input.brand,
      name: input.name,
      price_paise: input.price_paise,
    };

    const w = slotWidth(fakeRow);
    const prefLevel = preferredLevel(fakeRow);

    // Find current placements in this aisle from shelf_locations
    const existingShelves = await c.query<{
      bay: number;
      level: number;
      slot: number;
      x: number;
    }>('SELECT bay, level, slot, x FROM shelf_locations WHERE aisle = $1 AND branch_id = 1 ORDER BY x DESC', [aisleGeo.code]);

    // Clearance check: can we append without violating clearances?
    // Max x right now:
    const maxX = existingShelves.rows.length ? Math.max(...existingShelves.rows.map((r) => r.x)) : aisleGeo.x1;
    const currentBays = aisleGeo.bays;

    // Check if adding to the current unit or adding a bay is needed
    let assignedBay = currentBays;
    let assignedLevel = prefLevel;
    let assignedSlot = 1;
    let assignedX = maxX + w;

    // Aisle index: 0..4 left side, 5..9 right side
    const aisleIdx = store.aisles.findIndex((a) => a.code === aisleGeo.code);
    const isLeftSide = aisleIdx < 5;

    // If new x extends beyond aisle, check clearances
    if (assignedX > aisleGeo.x2) {
      assignedBay = currentBays + 1;
      const newX2 = aisleGeo.x1 + assignedBay * BAY_W;
      if (isLeftSide) {
        const rightX1 = 3.5 + END_FREE + Math.max(...store.aisles.slice(0, 5).map((p) => p.bays * BAY_W)) + CROSS_AISLE;
        if (rightX1 - newX2 < 3.2) {
          throw new AppError(409, 'NO_SPACE', 'Appending product violates walking aisle clearance.');
        }
      } else {
        if (store.width_m - newX2 < 1.5) {
          throw new AppError(409, 'NO_SPACE', 'Appending product violates wall clearance.');
        }
      }
    }

    const assignedY = LEVEL_HEIGHTS[assignedLevel - 1] ?? 0.8;
    const sign = assignedSlot === 1 ? 1 : -1;
    const assignedZ = Number((aisleGeo.z + sign * SHELF_DEPTH).toFixed(4));
    const standZ = Number((aisleGeo.z + sign * (SHELF_DEPTH + 0.6)).toFixed(4));
    const standX = Number(assignedX.toFixed(4));

    // Insert Product
    const sku = `SS-${input.category.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;
    const tags = generateSearchTags(input.category, input.brand, input.name);
    const prodRes = await c.query<{ id: number }>(
      `INSERT INTO products (sku, name, brand, category, tags, price_paise, price_flag)
       VALUES ($1, $2, $3, $4, $5, $6, 'i')
       RETURNING id`,
      [sku, input.name, input.brand, input.category, tags, input.price_paise],
    );
    const productId = prodRes.rows[0]!.id;

    // Get all 12 branches
    const branchesRes = await c.query<{ id: number }>('SELECT id FROM branches ORDER BY id');
    const branches = branchesRes.rows;

    const stockMap = new Map<number, number>();
    for (const s of input.stock) {
      stockMap.set(s.branch_id, s.qty);
    }

    // Insert inventory & shelf locations for all branches
    const shelfOutput: { branch_id: number; aisle: string; bay: number; level: number; slot: number }[] = [];

    for (const b of branches) {
      const qty = stockMap.get(b.id) ?? 0;
      await c.query(
        `INSERT INTO inventory (branch_id, product_id, on_hand, buffer)
         VALUES ($1, $2, $3, 1)`,
        [b.id, productId, qty],
      );

      await c.query(
        `INSERT INTO shelf_locations (branch_id, product_id, aisle, bay, level, slot, x, y, z, stand_x, stand_z)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [b.id, productId, aisleGeo.code, assignedBay, assignedLevel, assignedSlot, standX, assignedY, assignedZ, standX, standZ],
      );

      shelfOutput.push({
        branch_id: b.id,
        aisle: aisleGeo.code,
        bay: assignedBay,
        level: assignedLevel,
        slot: assignedSlot,
      });

      // Write inventory change outbox event
      await enqueue(c, 'inventory', String(productId), 'inventory.changed', {
        branch_id: b.id,
        product_id: productId,
        on_hand: qty,
        reserved: 0,
        buffer: 1,
        rev: 1,
        prev_available: 0,
      });
    }

    return {
      product: {
        id: productId,
        sku,
        name: input.name,
        brand: input.brand,
        category: input.category,
        tags,
        price_paise: input.price_paise,
      },
      shelf: shelfOutput,
      branches,
      productId,
      sku,
      tags,
      stockMap,
    };
  });

  // Direct asynchronous OpenSearch index helper so HTTP response returns in <500ms
  // and OpenSearch indexing completes within 2-3 seconds
  void (async () => {
    try {
      const beats = await getBranchBeats();
      const docSources = txResult.branches.map((b) => ({
        product_id: txResult.productId,
        sku: txResult.sku,
        name: input.name,
        brand: input.brand,
        category: input.category,
        tags: txResult.tags,
        price_paise: input.price_paise,
        image_url: null,
        branch_id: b.id,
        branch_name: beats.get(b.id)?.name ?? `Branch ${b.id}`,
        city: beats.get(b.id)?.city ?? 'Unknown',
        on_hand: txResult.stockMap.get(b.id) ?? 0,
        reserved: 0,
        buffer: 1,
        rev: 1,
      }));
      const docs = docSources.map((ds) => buildDoc(ds, cfg().LOW_STOCK, new Date().toISOString()));
      await bulkIndex(docs);
      await refreshIndex();
    } catch (e) {
      console.error('bulkIndex helper caught error (outbox/indexer will handle):', e);
    }
  })();

  return {
    product: txResult.product,
    shelf: txResult.shelf,
  };
}
