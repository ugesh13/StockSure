import fs from 'node:fs';
import path from 'node:path';
import { loadConfigOrExit } from '../src/config.ts';
import { closePool, getPool } from '../src/db.ts';
import { parseAndValidateCatalogue } from '../src/domain/catalogue.ts';
import { generateStore, placementPos, SHELF_DEPTH } from '../src/domain/layout/index.ts';
import { reindexAll } from '../src/search/reindex.ts';

loadConfigOrExit(['pg', 'opensearch']);

const reset = process.argv.includes('--reset');
if (reset && process.env.ALLOW_DESTRUCTIVE !== '1') {
  console.error('Destructive reset requires ALLOW_DESTRUCTIVE=1 environment variable.');
  process.exit(1);
}

// Locate catalogue.psv (in Backend or parent root)
function findCataloguePath(): string {
  const candidates = [
    path.resolve(process.cwd(), 'catalogue.psv'),
    path.resolve(process.cwd(), '../catalogue.psv'),
    path.resolve(process.cwd(), 'Backend/catalogue.psv'),
    path.resolve(process.cwd(), '../_parked_not_for_git/catalogue.psv'),
    path.resolve(process.cwd(), '_parked_not_for_git/catalogue.psv'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error('catalogue.psv not found in project root or current working directory');
}

const cataloguePath = findCataloguePath();
const psvContent = fs.readFileSync(cataloguePath, 'utf8');

// Parse and validate catalogue
const catalogueProducts = parseAndValidateCatalogue(psvContent);
if (catalogueProducts.length !== 235) {
  throw new Error(`Expected exactly 235 products in catalogue.psv, found ${catalogueProducts.length}`);
}

export const BRANCHES = [
  { id: 1, name: 'StockSure Koramangala', city: 'Bengaluru', lat: 12.9352, lng: 77.6245 },
  { id: 2, name: 'StockSure Indiranagar', city: 'Bengaluru', lat: 12.9784, lng: 77.6408 },
  { id: 3, name: 'StockSure Whitefield', city: 'Bengaluru', lat: 12.9698, lng: 77.7500 },
  { id: 4, name: 'StockSure Andheri', city: 'Mumbai', lat: 19.1136, lng: 72.8697 },
  { id: 5, name: 'StockSure Powai', city: 'Mumbai', lat: 19.1176, lng: 72.9060 },
  { id: 6, name: 'StockSure Connaught Place', city: 'Delhi', lat: 28.6315, lng: 77.2167 },
  { id: 7, name: 'StockSure Saket', city: 'Delhi', lat: 28.5245, lng: 77.2066 },
  { id: 8, name: 'StockSure Hitech City', city: 'Hyderabad', lat: 17.4435, lng: 78.3772 },
  { id: 9, name: 'StockSure T. Nagar', city: 'Chennai', lat: 13.0418, lng: 80.2341 },
  { id: 10, name: 'StockSure Kothrud', city: 'Pune', lat: 18.5074, lng: 73.8077 },
  { id: 11, name: 'StockSure Salt Lake', city: 'Kolkata', lat: 22.5800, lng: 88.4150 },
  { id: 12, name: 'StockSure Satellite', city: 'Ahmedabad', lat: 23.0300, lng: 72.5170 },
];

// Mulberry32 PRNG for deterministic stock generation
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(2026);

type StockSeed = { branch_id: number; product_id: number; on_hand: number; buffer: number };
const stock: StockSeed[] = [];

for (const p of catalogueProducts) {
  for (const b of BRANCHES) {
    if (p.id === 1) {
      // Product 1: branch 1 = 1 unit, branch 2 = 0, branch 3 = 4 (buffer 0)
      const qty = b.id === 1 ? 1 : b.id === 2 ? 0 : b.id === 3 ? 4 : 0;
      stock.push({ branch_id: b.id, product_id: p.id, on_hand: qty, buffer: 0 });
    } else if (p.id === 2) {
      // Product 2: 0 at all 12 branches (buffer 0)
      stock.push({ branch_id: b.id, product_id: p.id, on_hand: 0, buffer: 0 });
    } else if (p.id === 3) {
      // Product 3: 25 at all 12 branches (buffer 0)
      stock.push({ branch_id: b.id, product_id: p.id, on_hand: 25, buffer: 0 });
    } else if (p.id >= 90 && p.id <= 97) {
      // Products 90 to 97: at least 10 at every branch (buffer 0)
      stock.push({ branch_id: b.id, product_id: p.id, on_hand: 15, buffer: 0 });
    } else {
      // Deterministic distribution: 0 to 45, ~8% zeros, ~8% between 1 and 4, buffer 1
      const r = rand();
      const r2 = rand();
      const on_hand = r < 0.08 ? 0 : r < 0.16 ? 1 + Math.floor(r2 * 4) : 5 + Math.floor(r2 * 41);
      stock.push({ branch_id: b.id, product_id: p.id, on_hand, buffer: 1 });
    }
  }
}

// 20 demo customers
const customers = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  name: `Demo Shopper ${i + 1}`,
  email: `shopper${i + 1}@stocksure.example`,
  phone: `9000000${String(i + 1).padStart(3, '0')}`,
}));

// Generate store layout
const layoutRows = catalogueProducts.map((p) => ({
  id: p.id,
  category: p.category,
  brand: p.brand,
  name: p.name,
  price_paise: p.price_paise,
}));
const store = generateStore(layoutRows);

type ShelfLocationSeed = {
  branch_id: number;
  product_id: number;
  aisle: string;
  bay: number;
  level: number;
  slot: number;
  x: number;
  y: number;
  z: number;
  stand_x: number;
  stand_z: number;
};
const shelfLocations: ShelfLocationSeed[] = [];

for (const aisle of store.aisles) {
  for (const placement of aisle.placements) {
    const pos = placementPos(aisle, placement);
    const sign = placement.slot === 1 ? 1 : -1;
    const standZ = aisle.z + sign * (SHELF_DEPTH + 0.6);
    for (const b of BRANCHES) {
      shelfLocations.push({
        branch_id: b.id,
        product_id: placement.productId,
        aisle: aisle.code,
        bay: pos.bay,
        level: placement.level,
        slot: placement.slot,
        x: Number(pos.x.toFixed(4)),
        y: Number(pos.y.toFixed(4)),
        z: Number(pos.z.toFixed(4)),
        stand_x: Number(pos.x.toFixed(4)),
        stand_z: Number(standZ.toFixed(4)),
      });
    }
  }
}

const pool = getPool();
try {
  const existing = await pool.query<{ n: number }>('SELECT count(*)::int AS n FROM products');
  if ((existing.rows[0]?.n ?? 0) > 0 && !reset) {
    console.error('Products already exist. Run `npm run seed -- --reset` to wipe store data and seed again.');
    process.exit(1);
  }

  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    if (reset) {
      await c.query(
        `TRUNCATE notifications, stock_alerts, processed_events, outbox, stock_ledger, order_lines, orders, cart_items, carts, cart_codes, sessions, shelf_locations, inventory, products, branches, customers RESTART IDENTITY CASCADE`,
      );
    }

    // Insert branches with lat and lng and fresh heartbeat
    await c.query(
      `INSERT INTO branches (id, name, city, lat, lng, last_heartbeat_at)
       SELECT * FROM unnest($1::int[], $2::text[], $3::text[], $4::double precision[], $5::double precision[], $6::timestamptz[])`,
      [
        BRANCHES.map((b) => b.id),
        BRANCHES.map((b) => b.name),
        BRANCHES.map((b) => b.city),
        BRANCHES.map((b) => b.lat),
        BRANCHES.map((b) => b.lng),
        BRANCHES.map(() => new Date()),
      ],
    );

    // Insert customers
    await c.query(
      `INSERT INTO customers (id, name, email, phone)
       SELECT * FROM unnest($1::int[], $2::text[], $3::text[], $4::text[])`,
      [customers.map((x) => x.id), customers.map((x) => x.name), customers.map((x) => x.email), customers.map((x) => x.phone)],
    );

    // Insert products
    await c.query(
      `INSERT INTO products (id, sku, name, brand, category, tags, price_paise, price_flag, source_url, checked_on)
       SELECT v.id, v.sku, v.name, v.brand, v.category, string_to_array(v.tags, ','), v.price, v.price_flag, v.source_url, v.checked_on::date
         FROM unnest($1::int[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::int[], $8::text[], $9::text[], $10::text[])
           AS v(id, sku, name, brand, category, tags, price, price_flag, source_url, checked_on)`,
      [
        catalogueProducts.map((p) => p.id),
        catalogueProducts.map((p) => `SS-${p.category.slice(0, 3).toUpperCase()}-${String(p.id).padStart(3, '0')}`),
        catalogueProducts.map((p) => p.name),
        catalogueProducts.map((p) => p.brand),
        catalogueProducts.map((p) => p.category),
        catalogueProducts.map((p) => p.tags.join(',')),
        catalogueProducts.map((p) => p.price_paise),
        catalogueProducts.map((p) => p.price_flag),
        catalogueProducts.map((p) => p.source_url),
        catalogueProducts.map((p) => p.checked_on),
      ],
    );

    // Insert inventory
    await c.query(
      `INSERT INTO inventory (branch_id, product_id, on_hand, buffer)
       SELECT * FROM unnest($1::int[], $2::int[], $3::int[], $4::int[])`,
      [stock.map((s) => s.branch_id), stock.map((s) => s.product_id), stock.map((s) => s.on_hand), stock.map((s) => s.buffer)],
    );

    // Insert shelf_locations
    await c.query(
      `INSERT INTO shelf_locations (branch_id, product_id, aisle, bay, level, slot, x, y, z, stand_x, stand_z)
       SELECT * FROM unnest($1::int[], $2::int[], $3::text[], $4::int[], $5::int[], $6::int[], $7::double precision[], $8::double precision[], $9::double precision[], $10::double precision[], $11::double precision[])`,
      [
        shelfLocations.map((s) => s.branch_id),
        shelfLocations.map((s) => s.product_id),
        shelfLocations.map((s) => s.aisle),
        shelfLocations.map((s) => s.bay),
        shelfLocations.map((s) => s.level),
        shelfLocations.map((s) => s.slot),
        shelfLocations.map((s) => s.x),
        shelfLocations.map((s) => s.y),
        shelfLocations.map((s) => s.z),
        shelfLocations.map((s) => s.stand_x),
        shelfLocations.map((s) => s.stand_z),
      ],
    );

    for (const t of ['branches', 'customers', 'products']) {
      await c.query(`SELECT setval(pg_get_serial_sequence('${t}', 'id'), (SELECT max(id) FROM ${t}))`);
    }

    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }

  console.log(
    `Postgres: ${BRANCHES.length} branches, ${customers.length} customers, ${catalogueProducts.length} products, ${stock.length} inventory rows, ${shelfLocations.length} shelf locations.`,
  );
  const r = await reindexAll({ recreate: true });
  console.log(`OpenSearch: ${r.documents} documents indexed (expected ${r.expected}).`);
} finally {
  await closePool();
}
