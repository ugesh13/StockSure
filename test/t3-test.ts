import { loadConfigOrExit, cfg } from '../src/config.ts';
import { closePool, getPool } from '../src/db.ts';
import { buildApp } from '../src/app.ts';
import { osRequest, refreshIndex } from '../src/search/opensearch.ts';
import {
  generateStore,
  BAY_W,
  SHELF_DEPTH,
  ROW_PITCH,
  UNIT_DEPTH,
  type PackRow,
} from '../src/domain/layout/index.ts';

process.env.DEMO_MODE = 'true';
loadConfigOrExit(['pg', 'opensearch', 'api']);

const pool = getPool();
const app = await buildApp();
const staffKey = cfg().STAFF_KEY;

console.log('=== RUNNING TIER 3 TESTS ===\n');

async function deleteFromOs(prodId: number) {
  try {
    for (let b = 1; b <= 12; b++) {
      await osRequest('DELETE', `/${cfg().OPENSEARCH_INDEX}/_doc/${encodeURIComponent(`${prodId}:${b}`)}`, { okStatuses: [404] });
    }
    await refreshIndex();
  } catch {}
}

// Clean up any earlier test artifacts
const oldTestProds = await pool.query<{ id: number }>("SELECT id FROM products WHERE name LIKE 'AcousticBlast%'");
for (const row of oldTestProds.rows) {
  await pool.query('DELETE FROM outbox WHERE key = $1', [String(row.id)]);
  await pool.query('DELETE FROM shelf_locations WHERE product_id = $1', [row.id]);
  await pool.query('DELETE FROM inventory WHERE product_id = $1', [row.id]);
  await pool.query('DELETE FROM products WHERE id = $1', [row.id]);
  await deleteFromOs(row.id);
}

// ==========================================
// Test T3e: Missing or wrong staff key gives 401
// ==========================================
console.log('--- Test T3e: Missing or wrong staff key gives 401 ---');
const noKeyRes = await app.inject({
  method: 'POST',
  url: '/staff/products',
  payload: {
    name: 'Unauthorized Headphones',
    brand: 'TestBrand',
    category: 'audio',
    price_paise: 199900,
    stock: [{ branch_id: 1, qty: 10 }],
  },
});
console.log(`No key response: status=${noKeyRes.statusCode}`);
if (noKeyRes.statusCode !== 401) {
  throw new Error(`T3e failed: expected 401, got ${noKeyRes.statusCode}`);
}

const wrongKeyRes = await app.inject({
  method: 'POST',
  url: '/staff/products',
  headers: { 'x-staff-key': 'completely-wrong-key' },
  payload: {
    name: 'Unauthorized Headphones',
    brand: 'TestBrand',
    category: 'audio',
    price_paise: 199900,
    stock: [{ branch_id: 1, qty: 10 }],
  },
});
console.log(`Wrong key response: status=${wrongKeyRes.statusCode}`);
if (wrongKeyRes.statusCode !== 401) {
  throw new Error(`T3e failed: expected 401 for wrong key, got ${wrongKeyRes.statusCode}`);
}
console.log('T3e: PASS\n');

// ==========================================
// Test T3d: Invalid category or price gives 400 and writes nothing
// ==========================================
console.log('--- Test T3d: Invalid category or price gives 400 and writes nothing ---');
const prodCountBefore = (await pool.query<{ n: number }>('SELECT count(*)::int AS n FROM products')).rows[0].n;

// Bad category
const badCatRes = await app.inject({
  method: 'POST',
  url: '/staff/products',
  headers: { 'x-staff-key': staffKey },
  payload: {
    name: 'Bad Category Product',
    brand: 'TestBrand',
    category: 'nonexistent_category_xyz',
    price_paise: 50000,
  },
});
console.log(`Bad category response: status=${badCatRes.statusCode}`);
if (badCatRes.statusCode !== 400) {
  throw new Error(`T3d failed: expected 400 for bad category, got ${badCatRes.statusCode}`);
}

// Bad price (negative or zero)
const badPriceRes = await app.inject({
  method: 'POST',
  url: '/staff/products',
  headers: { 'x-staff-key': staffKey },
  payload: {
    name: 'Zero Price Product',
    brand: 'TestBrand',
    category: 'audio',
    price_paise: -100,
  },
});
console.log(`Bad price response: status=${badPriceRes.statusCode}`);
if (badPriceRes.statusCode !== 400) {
  throw new Error(`T3d failed: expected 400 for non-positive price, got ${badPriceRes.statusCode}`);
}

const prodCountAfter = (await pool.query<{ n: number }>('SELECT count(*)::int AS n FROM products')).rows[0].n;
if (prodCountBefore !== prodCountAfter) {
  throw new Error(`T3d failed: product count changed despite validation errors`);
}
console.log(`Product count unchanged (${prodCountAfter}).`);
console.log('T3d: PASS\n');

// ==========================================
// Add product successfully via POST /staff/products
// ==========================================
console.log('--- Adding new staff product ---');
const testProductName = `AcousticBlast Wireless Headphones ${Date.now()}`;
const addRes = await app.inject({
  method: 'POST',
  url: '/staff/products',
  headers: { 'x-staff-key': staffKey },
  payload: {
    name: testProductName,
    brand: 'SoundMaster',
    category: 'audio',
    price_paise: 299900,
    stock: [
      { branch_id: 1, qty: 15 },
      { branch_id: 2, qty: 8 },
    ],
  },
});

console.log(`Add product status: ${addRes.statusCode}`);
if (addRes.statusCode !== 201) {
  throw new Error(`Failed to add product: ${addRes.statusCode} ${addRes.body}`);
}
const addData = JSON.parse(addRes.body);
const newProductId = addData.product.id;
console.log(`Created product ID: ${newProductId}, Sku: ${addData.product.sku}`);
console.log(`Shelf assignments count: ${addData.shelf.length}`);

// ==========================================
// Test T3a: Product is searchable in OpenSearch within 5 s
// ==========================================
console.log('--- Test T3a: Searchable in OpenSearch within 5s ---');
const startTime = Date.now();
let foundInSearch = false;
while (Date.now() - startTime < 5000) {
  const searchRes = await app.inject({
    method: 'GET',
    url: '/search?q=AcousticBlast',
  });
  if (searchRes.statusCode === 200) {
    const searchData = JSON.parse(searchRes.body);
    if (startTime === Date.now() || !foundInSearch) {
      console.log('Search response source:', searchData.source, 'total:', searchData.total, 'hits:', searchData.results?.map((r: any) => ({ id: r.id, name: r.name })));
    }
    if (searchData.source === 'opensearch' && searchData.results?.some((r: any) => r.product_id === newProductId)) {
      foundInSearch = true;
      console.log(`Found product ${newProductId} in OpenSearch search results within ${Date.now() - startTime} ms (source: ${searchData.source})`);
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 200));
}
if (!foundInSearch) {
  throw new Error(`T3a failed: product ${newProductId} not searchable within 5s`);
}
console.log('T3a: PASS\n');

// ==========================================
// Test T3b: Product appears in /branches/:id/shelves and in layout
// ==========================================
console.log('--- Test T3b: Appears in shelves and layout ---');
// 1. Shelves
const shelvesRes = await app.inject({ method: 'GET', url: '/branches/1/shelves' });
const shelvesData = JSON.parse(shelvesRes.body);
const inShelves = shelvesData.items.find((i: any) => i.product_id === newProductId);
console.log(`In branch 1 shelves: found=${Boolean(inShelves)}, available=${inShelves?.available}, aisle=${inShelves?.aisle}`);
if (!inShelves || inShelves.available !== 14) { // on_hand 15 - buffer 1 = 14
  throw new Error(`T3b failed: product not found in shelves or incorrect available count`);
}

// 2. Layout
const layoutRes = await app.inject({ method: 'GET', url: '/branches/1/layout' });
const layoutData = JSON.parse(layoutRes.body);
console.log(`Layout gondola bays: ${layoutData.layout.gondola.bays}, aisles: ${layoutData.layout.aisles.length}`);
if (layoutData.layout.aisles.length !== 10) {
  throw new Error('T3b failed: layout did not return 10 aisles');
}
console.log('T3b: PASS\n');

// ==========================================
// Test T3c: T2b clearance rules still pass afterwards
// ==========================================
console.log('--- Test T3c: Clearance rules still pass afterwards ---');
const prodsAllRes = await pool.query<PackRow>('SELECT id, category, brand, name, price_paise FROM products ORDER BY id');
const updatedStore = generateStore(prodsAllRes.rows);

const sideClearance = Number((ROW_PITCH - UNIT_DEPTH).toFixed(2));
const leftAisles = updatedStore.aisles.slice(0, 5);
const rightAisles = updatedStore.aisles.slice(5);
const crossAisleClearance = Number((Math.min(...rightAisles.map((a) => a.x1)) - Math.max(...leftAisles.map((a) => a.x2))).toFixed(2));
const leftWallClearance = Number(Math.min(...leftAisles.map((a) => a.x1)).toFixed(2));
const rightWallClearance = Number((updatedStore.width_m - Math.max(...rightAisles.map((a) => a.x2))).toFixed(2));
const backWallClearance = Number((Math.min(...updatedStore.aisles.map((a) => a.z)) - SHELF_DEPTH).toFixed(2));
const frontWallClearance = Number((updatedStore.depth_m - (Math.max(...updatedStore.aisles.map((a) => a.z)) + SHELF_DEPTH)).toFixed(2));

console.log(`Post-append side clearance: ${sideClearance} m (>= 3.2 m)`);
console.log(`Post-append cross aisle: ${crossAisleClearance} m (>= 4.0 m)`);
console.log(`Post-append wall clearances: L=${leftWallClearance}m, R=${rightWallClearance}m, Back=${backWallClearance}m, Front=${frontWallClearance}m (all >= 1.5 m)`);

if (
  sideClearance < 3.2 ||
  crossAisleClearance < 4.0 ||
  leftWallClearance < 1.5 ||
  rightWallClearance < 1.5 ||
  backWallClearance < 1.5 ||
  frontWallClearance < 1.5
) {
  throw new Error('T3c failed: clearance violation detected after appending product');
}
console.log('T3c: PASS\n');

// Clean up test product
console.log('Cleaning up test product...');
await pool.query('DELETE FROM outbox WHERE key = $1', [String(newProductId)]);
await pool.query('DELETE FROM shelf_locations WHERE product_id = $1', [newProductId]);
await pool.query('DELETE FROM inventory WHERE product_id = $1', [newProductId]);
await pool.query('DELETE FROM products WHERE id = $1', [newProductId]);
await deleteFromOs(newProductId);

console.log('=== ALL TIER 3 TESTS PASSED! ===');
await app.close();
await closePool();
process.exit(0);
