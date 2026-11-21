import { loadConfigOrExit } from '../src/config.ts';
import { closePool, getPool } from '../src/db.ts';
import { reindexAll } from '../src/search/reindex.ts';
import { runSeedNursery } from './seed-nursery.ts';
import { runSeedLayout } from './seed-layout.ts';

// `npm run seed`: the StockSure Nursery catalogue end to end.
//   1. 12 branches and 20 demo shoppers (only if they are missing)
//   2. 53 plants x 3 sizes from data/nursery_plants_seed.csv, with stock at every branch (scripts/seed-nursery.ts)
//   3. Shelf map for the 3D store (scripts/seed-layout.ts)
//   4. OpenSearch index rebuilt from Postgres
// Safe to run again: everything is an upsert. `--reset` wipes store data first and needs ALLOW_DESTRUCTIVE=1.

loadConfigOrExit(['pg', 'opensearch']);

const reset = process.argv.includes('--reset');
if (reset && process.env.ALLOW_DESTRUCTIVE !== '1') {
  console.error('Destructive reset requires ALLOW_DESTRUCTIVE=1 environment variable.');
  process.exit(1);
}

export const BRANCHES = [
  { id: 1, name: 'StockSure Koramangala', city: 'Bengaluru', lat: 12.9352, lng: 77.6245 },
  { id: 2, name: 'StockSure Indiranagar', city: 'Bengaluru', lat: 12.9784, lng: 77.6408 },
  { id: 3, name: 'StockSure Whitefield', city: 'Bengaluru', lat: 12.9698, lng: 77.75 },
  { id: 4, name: 'StockSure Andheri', city: 'Mumbai', lat: 19.1136, lng: 72.8697 },
  { id: 5, name: 'StockSure Powai', city: 'Mumbai', lat: 19.1176, lng: 72.906 },
  { id: 6, name: 'StockSure Connaught Place', city: 'Delhi', lat: 28.6315, lng: 77.2167 },
  { id: 7, name: 'StockSure Saket', city: 'Delhi', lat: 28.5245, lng: 77.2066 },
  { id: 8, name: 'StockSure Hitech City', city: 'Hyderabad', lat: 17.4435, lng: 78.3772 },
  { id: 9, name: 'StockSure T. Nagar', city: 'Chennai', lat: 13.0418, lng: 80.2341 },
  { id: 10, name: 'StockSure Kothrud', city: 'Pune', lat: 18.5074, lng: 73.8077 },
  { id: 11, name: 'StockSure Salt Lake', city: 'Kolkata', lat: 22.58, lng: 88.415 },
  { id: 12, name: 'StockSure Satellite', city: 'Ahmedabad', lat: 23.03, lng: 72.517 },
];

const customers = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  name: `Demo Shopper ${i + 1}`,
  email: `shopper${i + 1}@stocksure.example`,
  phone: `9000000${String(i + 1).padStart(3, '0')}`,
}));

const pool = getPool();
try {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    if (reset) {
      await c.query(
        `TRUNCATE notifications, stock_alerts, processed_events, outbox, stock_ledger, order_lines, orders, cart_items, carts, cart_codes, sessions, shelf_locations, inventory, products, branches, customers RESTART IDENTITY CASCADE`,
      );
    }
    await c.query(
      `INSERT INTO branches (id, name, city, lat, lng, last_heartbeat_at)
       SELECT v.*, now() FROM unnest($1::int[], $2::text[], $3::text[], $4::double precision[], $5::double precision[]) AS v
       ON CONFLICT (id) DO NOTHING`,
      [BRANCHES.map((b) => b.id), BRANCHES.map((b) => b.name), BRANCHES.map((b) => b.city), BRANCHES.map((b) => b.lat), BRANCHES.map((b) => b.lng)],
    );
    await c.query(
      `INSERT INTO customers (id, name, email, phone)
       SELECT * FROM unnest($1::int[], $2::text[], $3::text[], $4::text[])
       ON CONFLICT (id) DO NOTHING`,
      [customers.map((x) => x.id), customers.map((x) => x.name), customers.map((x) => x.email), customers.map((x) => x.phone)],
    );
    for (const t of ['branches', 'customers']) {
      await c.query(`SELECT setval(pg_get_serial_sequence('${t}', 'id'), GREATEST((SELECT max(id) FROM ${t}), 1))`);
    }
    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }

  await runSeedNursery();
  const layout = await runSeedLayout();
  console.log(`Shelf layout: ${layout.products} products placed in ${layout.aisles} aisles.`);
  const r = await reindexAll({ recreate: true });
  console.log(`OpenSearch: ${r.documents} documents indexed (expected ${r.expected}).`);
} finally {
  await closePool();
}
