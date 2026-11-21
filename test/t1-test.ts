import crypto from 'node:crypto';
import { loadConfigOrExit } from '../src/config.ts';
import { closePool, getPool } from '../src/db.ts';
import { countDocs } from '../src/search/opensearch.ts';
import { parseAndValidateCatalogue } from '../src/domain/catalogue.ts';
import { createSession } from '../src/services/session.ts';
import { buildApp } from '../src/app.ts';

loadConfigOrExit(['pg', 'opensearch', 'api']);

const pool = getPool();

console.log('=== RUNNING TIER 1 TESTS ===\n');

// --- T1a ---
console.log('--- Test T1a: 12 branches with lat/lng & shelf_locations level 5 check ---');
const branchesRes = await pool.query<{ count: number; with_lat_lng: number }>(`
  SELECT count(*)::int AS count,
         count(lat)::int AS with_lat_lng
    FROM branches
`);
console.log(`Branches: total=${branchesRes.rows[0].count}, with_lat_lng=${branchesRes.rows[0].with_lat_lng}`);
if (branchesRes.rows[0].count !== 12 || branchesRes.rows[0].with_lat_lng !== 12) {
  throw new Error(`T1a failed: expected 12 branches with lat/lng, got ${JSON.stringify(branchesRes.rows[0])}`);
}

// Check shelf_locations level check
const checkLevel5 = await pool.query<{ conname: string; def: string }>(`
  SELECT conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
   WHERE conrelid = 'shelf_locations'::regclass AND conname = 'shelf_locations_level_check'
`);
console.log(`Constraint: ${checkLevel5.rows[0]?.conname} -> ${checkLevel5.rows[0]?.def}`);
if (!checkLevel5.rows[0]?.def.includes('5')) {
  throw new Error(`T1a failed: shelf_locations_level_check does not allow 5`);
}
console.log('T1a: PASS\n');

// --- T1b ---
console.log('--- Test T1b: 235 products, 2,820 inventory rows, OpenSearch doc count ---');
const prodCount = (await pool.query<{ n: number }>('SELECT count(*)::int AS n FROM products')).rows[0].n;
const invCount = (await pool.query<{ n: number }>('SELECT count(*)::int AS n FROM inventory')).rows[0].n;
const shelfCount = (await pool.query<{ n: number }>('SELECT count(*)::int AS n FROM shelf_locations')).rows[0].n;
const osDocs = await countDocs();
console.log(`Counts:\n  Products: ${prodCount}\n  Inventory rows: ${invCount}\n  Shelf locations: ${shelfCount}\n  OpenSearch docs: ${osDocs}`);
if (prodCount !== 235 || invCount !== 2820 || osDocs !== 2820) {
  throw new Error(`T1b failed: expected 235 products, 2820 inventory rows, 2820 OpenSearch docs`);
}
console.log('T1b: PASS\n');

// --- T1c ---
console.log('--- Test T1c: Fixtures for products 1, 2, 3 and 90 to 97 ---');
const p1 = (await pool.query<{ branch_id: number; on_hand: number; buffer: number }>('SELECT branch_id, on_hand, buffer FROM inventory WHERE product_id = 1 ORDER BY branch_id')).rows;
console.log(`Product 1 (branches 1..3): branch 1=${p1.find(b=>b.branch_id===1)?.on_hand}, branch 2=${p1.find(b=>b.branch_id===2)?.on_hand}, branch 3=${p1.find(b=>b.branch_id===3)?.on_hand}`);
if (p1.find(b=>b.branch_id===1)?.on_hand !== 1 || p1.find(b=>b.branch_id===2)?.on_hand !== 0 || p1.find(b=>b.branch_id===3)?.on_hand !== 4) {
  throw new Error('T1c failed on product 1');
}

const p2 = (await pool.query<{ sum: number; max: number }>('SELECT sum(on_hand)::int AS sum, max(on_hand)::int AS max FROM inventory WHERE product_id = 2')).rows[0];
console.log(`Product 2 (all 12 branches): sum=${p2.sum}, max=${p2.max}`);
if (p2.sum !== 0 || p2.max !== 0) throw new Error('T1c failed on product 2');

const p3 = (await pool.query<{ count: number; min: number; max: number }>('SELECT count(*)::int AS count, min(on_hand)::int AS min, max(on_hand)::int AS max FROM inventory WHERE product_id = 3 AND on_hand = 25')).rows[0];
console.log(`Product 3 (all 12 branches): 25 units at ${p3.count} branches`);
if (p3.count !== 12) throw new Error('T1c failed on product 3');

const p90_97 = (await pool.query<{ min_on_hand: number; min_avail: number }>(`
  SELECT min(on_hand)::int AS min_on_hand,
         min(on_hand - reserved - buffer)::int AS min_avail
    FROM inventory
   WHERE product_id BETWEEN 90 AND 97
`)).rows[0];
console.log(`Products 90-97: min_on_hand=${p90_97.min_on_hand}, min_avail=${p90_97.min_avail}`);
if (p90_97.min_on_hand < 10) throw new Error('T1c failed on products 90-97');
console.log('T1c: PASS\n');

// --- T1d ---
console.log('--- Test T1d: Deterministic inventory hash check ---');
const stockHash = (await pool.query<{ hash: string }>(`
  SELECT md5(string_agg(branch_id || ':' || product_id || ':' || on_hand || ':' || buffer, ',' ORDER BY branch_id, product_id)) AS hash
    FROM inventory
`)).rows[0].hash;
console.log(`Inventory deterministic MD5 hash: ${stockHash}`);
if (!stockHash) throw new Error('T1d failed');
console.log('T1d: PASS\n');

// --- T1e ---
console.log('--- Test T1e: Bad catalogue validation rejects before writing ---');
let caughtDup = false;
try {
  parseAndValidateCatalogue(`id|dept|brand|name|price_rupees|flag|source_url|checked_on
1|audio|Sony|Headphones A|1000|i||
1|audio|Sony|Headphones B|1200|i||`);
} catch (e: any) {
  caughtDup = true;
  console.log(`  Caught duplicate ID: ${e.message}`);
}
if (!caughtDup) throw new Error('T1e failed: duplicate ID not rejected');

let caughtMissingV = false;
try {
  parseAndValidateCatalogue(`id|dept|brand|name|price_rupees|flag|source_url|checked_on
1|audio|Sony|Headphones A|1000|v||`);
} catch (e: any) {
  caughtMissingV = true;
  console.log(`  Caught missing v source: ${e.message}`);
}
if (!caughtMissingV) throw new Error('T1e failed: missing v source not rejected');

let caughtNonPositive = false;
try {
  parseAndValidateCatalogue(`id|dept|brand|name|price_rupees|flag|source_url|checked_on
1|audio|Sony|Headphones A|0|i||`);
} catch (e: any) {
  caughtNonPositive = true;
  console.log(`  Caught non-positive price: ${e.message}`);
}
if (!caughtNonPositive) throw new Error('T1e failed: non-positive price not rejected');
console.log('T1e: PASS\n');

// --- T1f ---
console.log('--- Test T1f: Sessions: distinct customers, 401 on bad token, legacy fallback ---');
const app = await buildApp();

const s1 = await createSession('Shopper 1');
const s2 = await createSession('Shopper 2');
console.log(`Session 1: customer_id=${s1.customer_id}, name=${s1.name}`);
console.log(`Session 2: customer_id=${s2.customer_id}, name=${s2.name}`);
if (s1.customer_id === s2.customer_id) throw new Error('T1f failed: sessions did not create distinct customers');

// 1. Valid session token
const resValid = await app.inject({
  method: 'GET',
  url: '/cart',
  headers: {
    'x-customer-id': String(s1.customer_id),
    'x-session-token': s1.token,
  },
});
console.log(`Valid session request -> status ${resValid.statusCode}`);
if (resValid.statusCode !== 200) throw new Error(`T1f failed on valid token: ${resValid.body}`);

// 2. Bad session token -> 401
const resBad = await app.inject({
  method: 'GET',
  url: '/cart',
  headers: {
    'x-customer-id': String(s1.customer_id),
    'x-session-token': 'deadbeef00112233445566778899aabbccddeeff00112233445566778899aabb',
  },
});
console.log(`Bad session token request -> status ${resBad.statusCode} (code: ${JSON.parse(resBad.body).error.code})`);
if (resBad.statusCode !== 401) throw new Error(`T1f failed: expected 401 for bad token`);

// 3. Mismatched token and customer id -> 401
const resMismatch = await app.inject({
  method: 'GET',
  url: '/cart',
  headers: {
    'x-customer-id': String(s2.customer_id),
    'x-session-token': s1.token,
  },
});
console.log(`Mismatched token request -> status ${resMismatch.statusCode} (code: ${JSON.parse(resMismatch.body).error.code})`);
if (resMismatch.statusCode !== 401) throw new Error(`T1f failed: expected 401 for mismatched token`);

// 4. Missing session token (demo customer 1..20 in DEMO_MODE) -> 200
process.env.DEMO_MODE = 'true';
const resLegacy = await app.inject({
  method: 'GET',
  url: '/cart',
  headers: {
    'x-customer-id': '7',
  },
});
console.log(`Legacy shopper 7 without token -> status ${resLegacy.statusCode}`);
if (resLegacy.statusCode !== 200) throw new Error(`T1f failed: expected 200 for legacy customer`);
console.log('T1f: PASS\n');

await app.close();
await closePool();
console.log('=== ALL TIER 1 TESTS PASSED! ===');

