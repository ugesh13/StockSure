import { loadConfigOrExit } from '../src/config.ts';
import { closePool, getPool } from '../src/db.ts';
import { buildApp } from '../src/app.ts';
import {
  generateStore,
  BAY_W,
  SHELF_DEPTH,
  ROW_PITCH,
  UNIT_DEPTH,
  CROSS_AISLE,
  END_FREE,
  type PackRow,
} from '../src/domain/layout/index.ts';
import { posSale } from '../src/services/pos.ts';

process.env.DEMO_MODE = 'true';
loadConfigOrExit(['pg', 'opensearch', 'api']);

const pool = getPool();
const app = await buildApp();

console.log('=== RUNNING TIER 2 TESTS ===\n');

// ==========================================
// Test T2b: Clearance check for all 12 branches
// ==========================================
console.log('--- Test T2b: Clearance check for all 12 branches ---');
const branchesRes = await pool.query<{ id: number; name: string }>('SELECT id, name FROM branches ORDER BY id');
const prodsRes = await pool.query<PackRow>('SELECT id, category, brand, name, price_paise FROM products ORDER BY id');
const store = generateStore(prodsRes.rows);

// 1. Walking aisle clearance between sides of adjacent gondolas
// ROW_PITCH = 4.4m, UNIT_DEPTH = 1.1m -> 4.4 - 1.1 = 3.3m
const sideClearance = Number((ROW_PITCH - UNIT_DEPTH).toFixed(2));
console.log(`Walking aisle clearance between unit sides: ${sideClearance} m (required >= 3.2 m)`);
if (sideClearance < 3.2) {
  throw new Error(`T2b failed: side clearance ${sideClearance} m < 3.2 m`);
}

// 2. Cross aisle clearance between left and right column
const leftAisles = store.aisles.slice(0, 5);
const rightAisles = store.aisles.slice(5);
const leftMaxX2 = Math.max(...leftAisles.map((a) => a.x2));
const rightMinX1 = Math.min(...rightAisles.map((a) => a.x1));
const crossAisleClearance = Number((rightMinX1 - leftMaxX2).toFixed(2));
console.log(`Cross aisle clearance: ${crossAisleClearance} m (required >= 4.0 m)`);
if (crossAisleClearance < 4.0) {
  throw new Error(`T2b failed: cross aisle clearance ${crossAisleClearance} m < 4.0 m`);
}

// 3. End clearance to walls
// Left ends to left wall (x=0)
const leftWallClearance = Number(Math.min(...leftAisles.map((a) => a.x1)).toFixed(2));
// Right ends to right wall (x=width_m)
const rightWallClearance = Number((store.width_m - Math.max(...rightAisles.map((a) => a.x2))).toFixed(2));
// Back unit edge to back wall (z=0)
const backWallClearance = Number((Math.min(...store.aisles.map((a) => a.z)) - SHELF_DEPTH).toFixed(2));
// Front unit edge to entrance wall (z=depth_m)
const frontWallClearance = Number((store.depth_m - (Math.max(...store.aisles.map((a) => a.z)) + SHELF_DEPTH)).toFixed(2));

console.log(`Left wall clearance: ${leftWallClearance} m (required >= 1.5 m)`);
console.log(`Right wall clearance: ${rightWallClearance} m (required >= 1.5 m)`);
console.log(`Back wall clearance: ${backWallClearance} m (required >= 1.5 m)`);
console.log(`Front wall clearance: ${frontWallClearance} m (required >= 1.5 m)`);

if (leftWallClearance < 1.5 || rightWallClearance < 1.5 || backWallClearance < 1.5 || frontWallClearance < 1.5) {
  throw new Error('T2b failed: wall clearance < 1.5 m');
}

console.log(`Verified clearances across all ${branchesRes.rows.length} branches.`);
console.log('T2b: PASS\n');

// ==========================================
// Test T2c: Placement uniqueness
// ==========================================
console.log('--- Test T2c: Placement uniqueness ---');
// 1. No product has two locations in one branch
const dupCheck = await pool.query(`
  SELECT branch_id, product_id, count(*)::int AS count
    FROM shelf_locations
   GROUP BY branch_id, product_id
  HAVING count(*) > 1
`);
if (dupCheck.rows.length > 0) {
  throw new Error(`T2c failed: found products with multiple locations in a branch: ${JSON.stringify(dupCheck.rows)}`);
}
console.log('1. Duplicate locations check: 0 duplicates found.');

// 2. Every product in catalogue has a location in all 12 branches
const branchCounts = await pool.query<{ branch_id: number; product_count: number }>(`
  SELECT branch_id, count(DISTINCT product_id)::int AS product_count
    FROM shelf_locations
   GROUP BY branch_id
   ORDER BY branch_id
`);
if (branchCounts.rows.length !== 12 || branchCounts.rows.some((r) => r.product_count !== 235)) {
  throw new Error(`T2c failed: not all branches have 235 product locations: ${JSON.stringify(branchCounts.rows)}`);
}
console.log(`2. All 12 branches have exactly 235 distinct product locations.`);

// 3. No location without a product
const orphanLocations = await pool.query<{ count: number }>(`
  SELECT count(*)::int AS count
    FROM shelf_locations sl
   WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.id = sl.product_id)
`);
if (orphanLocations.rows[0]?.count !== 0) {
  throw new Error(`T2c failed: found ${orphanLocations.rows[0]?.count} orphan shelf locations`);
}
console.log('3. Orphan locations check: 0 orphan locations found.');
console.log('T2c: PASS\n');

// ==========================================
// Test T2d: Concurrent IN_STORE race: 2 concurrent checkouts for product 1 at branch 1 (run 5 times)
// ==========================================
console.log('--- Test T2d: Concurrent IN_STORE race (5 runs) ---');
for (let run = 1; run <= 5; run++) {
  // Ensure product 1 has on_hand 1, reserved 0 at branch 1
  await pool.query('UPDATE inventory SET on_hand = 1, reserved = 0 WHERE branch_id = 1 AND product_id = 1');

  // Load carts for customer 1 and customer 2
  await app.inject({ method: 'DELETE', url: '/cart', headers: { 'x-customer-id': '1' } });
  await app.inject({ method: 'DELETE', url: '/cart', headers: { 'x-customer-id': '2' } });

  await app.inject({
    method: 'POST',
    url: '/cart/items',
    headers: { 'x-customer-id': '1' },
    payload: { product_id: 1, branch_id: 1, qty: 1 },
  });
  await app.inject({
    method: 'POST',
    url: '/cart/items',
    headers: { 'x-customer-id': '2' },
    payload: { product_id: 1, branch_id: 1, qty: 1 },
  });

  const runKey = `t2d-race-run${run}-${Date.now()}`;

  // Execute concurrent checkouts
  const [res1, res2] = await Promise.all([
    app.inject({
      method: 'POST',
      url: '/checkout',
      headers: { 'x-customer-id': '1', 'idempotency-key': `${runKey}-c1` },
      payload: { fulfilment: 'IN_STORE', branch_id: 1 },
    }),
    app.inject({
      method: 'POST',
      url: '/checkout',
      headers: { 'x-customer-id': '2', 'idempotency-key': `${runKey}-c2` },
      payload: { fulfilment: 'IN_STORE', branch_id: 1 },
    }),
  ]);

  const statuses = [res1.statusCode, res2.statusCode].sort();
  const c1Status = res1.statusCode;
  const c2Status = res2.statusCode;
  console.log(`Run ${run}: Customer 1 status=${c1Status}, Customer 2 status=${c2Status} (expected one 201, one 409)`);

  if (statuses[0] !== 201 || statuses[1] !== 409) {
    throw new Error(`T2d failed on run ${run}: expected [201, 409], got [${c1Status}, ${c2Status}]`);
  }

  // Cancel the winner's order so stock returns for next run
  const winnerRes = res1.statusCode === 201 ? res1 : res2;
  const winnerCust = res1.statusCode === 201 ? '1' : '2';
  const orderId = JSON.parse(winnerRes.body).order?.id;
  if (orderId) {
    await app.inject({
      method: 'POST',
      url: `/orders/${orderId}/cancel`,
      headers: { 'x-customer-id': winnerCust },
    });
  }
}
console.log('T2d: PASS (5/5 runs gave exactly one 201 and one 409)\n');

// ==========================================
// Test T2e: shelves?since= returns only products whose stock changed
// ==========================================
console.log('--- Test T2e: shelves?since= changed items only ---');
// Call shelves first to get current as_of
const initialShelves = await app.inject({ method: 'GET', url: '/branches/1/shelves' });
const sinceIso = JSON.parse(initialShelves.body).as_of;
await new Promise((r) => setTimeout(r, 100));

// Sell 1 unit of product 3 at branch 1
await posSale(1, 3, 1);

// Query shelves with since
const shelvesRes = await app.inject({
  method: 'GET',
  url: `/branches/1/shelves?since=${encodeURIComponent(sinceIso)}`,
});

if (shelvesRes.statusCode !== 200) {
  throw new Error(`T2e failed: status ${shelvesRes.statusCode}: ${shelvesRes.body}`);
}
const shelvesData = JSON.parse(shelvesRes.body);
console.log(`Items returned with since=${sinceIso}: ${shelvesData.items.length}`);
if (shelvesData.items.length !== 1 || shelvesData.items[0].product_id !== 3) {
  throw new Error(`T2e failed: expected exactly 1 item (product 3), got ${JSON.stringify(shelvesData.items)}`);
}
console.log(`Updated product: ID=${shelvesData.items[0].product_id}, Name=${shelvesData.items[0].name}, Available=${shelvesData.items[0].available}, Status=${shelvesData.items[0].status}`);
console.log('T2e: PASS\n');

// Restore product 3 stock back to 25
await pool.query('UPDATE inventory SET on_hand = 25, reserved = 0 WHERE branch_id = 1 AND product_id = 3');

// ==========================================
// Test T2f: Kiosk code lookup: right branch vs wrong branch, 404 after expiry
// ==========================================
console.log('--- Test T2f: Kiosk code verification ---');
// Put product 3 at branch 1 in customer 1's cart
await app.inject({ method: 'DELETE', url: '/cart', headers: { 'x-customer-id': '1' } });
await app.inject({
  method: 'POST',
  url: '/cart/items',
  headers: { 'x-customer-id': '1' },
  payload: { product_id: 3, branch_id: 1, qty: 2 },
});

// Generate cart code
const codeRes = await app.inject({
  method: 'POST',
  url: '/cart/code',
  headers: { 'x-customer-id': '1' },
});
const { code } = JSON.parse(codeRes.body);
console.log(`Generated cart code: ${code}`);

// Look up at same branch (branch 1)
const kioskSameRes = await app.inject({
  method: 'GET',
  url: `/kiosk/cart/${code}?branch_id=1`,
});
const kioskSameData = JSON.parse(kioskSameRes.body);
console.log(`At branch 1: lines=${kioskSameData.lines.length}, at_this_branch=${kioskSameData.lines[0]?.at_this_branch}`);
if (kioskSameData.lines[0]?.at_this_branch !== true) {
  throw new Error('T2f failed: expected at_this_branch: true at same branch');
}

// Look up at different branch (branch 2)
const kioskDiffRes = await app.inject({
  method: 'GET',
  url: `/kiosk/cart/${code}?branch_id=2`,
});
const kioskDiffData = JSON.parse(kioskDiffRes.body);
console.log(`At branch 2: lines=${kioskDiffData.lines.length}, at_this_branch=${kioskDiffData.lines[0]?.at_this_branch}`);
if (kioskDiffData.lines[0]?.at_this_branch !== false) {
  throw new Error('T2f failed: expected at_this_branch: false at different branch');
}

// Expire the code in DB
await pool.query("UPDATE cart_codes SET expires_at = now() - interval '5 seconds' WHERE code = $1", [code]);

const kioskExpiredRes = await app.inject({
  method: 'GET',
  url: `/kiosk/cart/${code}?branch_id=1`,
});
console.log(`Expired code status: ${kioskExpiredRes.statusCode} (expected 404)`);
if (kioskExpiredRes.statusCode !== 404) {
  throw new Error(`T2f failed: expected 404 for expired code, got ${kioskExpiredRes.statusCode}`);
}
console.log('T2f: PASS\n');

// ==========================================
// Test T2g: /demo/pipeline turns unhealthy when worker stopped and paid order exists
// ==========================================
console.log('--- Test T2g: /demo/pipeline health check ---');
// 1. Initial pipeline state
const pipeInitial = await app.inject({ method: 'GET', url: '/demo/pipeline' });
const pipeInitData = JSON.parse(pipeInitial.body);
console.log(`Initial pipeline: healthy=${pipeInitData.healthy}, awaiting=${pipeInitData.awaiting_finalizer}`);

// 2. Simulate paid order waiting for finalizer that is 15s old
const simOrderId = `00000000-0000-0000-0000-${Date.now().toString(16).padStart(12, '0')}`;
await pool.query(`
  INSERT INTO orders (id, customer_id, status, total_paise, fulfilment, idempotency_key, paid_at, finalized_at)
  VALUES ($1, 1, 'PLACED', 1000, 'PICKUP', $2, now() - interval '15 seconds', NULL)
`, [simOrderId, `sim-key-${Date.now()}`]);

const pipeUnhealthy = await app.inject({ method: 'GET', url: '/demo/pipeline' });
const pipeUnhealthyData = JSON.parse(pipeUnhealthy.body);
console.log(`After 15s-old paid order: healthy=${pipeUnhealthyData.healthy}, awaiting=${pipeUnhealthyData.awaiting_finalizer}, oldest_s=${pipeUnhealthyData.awaiting_finalizer_oldest_s}`);
if (pipeUnhealthyData.healthy !== false || pipeUnhealthyData.awaiting_finalizer_oldest_s <= 10) {
  throw new Error('T2g failed: pipeline did not report unhealthy with 15s-old awaiting order');
}

// 3. Mark the order finalized (simulating worker processing)
await pool.query('UPDATE orders SET finalized_at = now() WHERE id = $1', [simOrderId]);
const pipeRecovered = await app.inject({ method: 'GET', url: '/demo/pipeline' });
const pipeRecData = JSON.parse(pipeRecovered.body);
console.log(`After finalized: healthy=${pipeRecData.healthy}, awaiting=${pipeRecData.awaiting_finalizer}`);
if (pipeRecData.healthy !== true) {
  throw new Error('T2g failed: pipeline did not recover to healthy');
}

// Clean up simulated order
await pool.query('DELETE FROM orders WHERE id = $1', [simOrderId]);
console.log('T2g: PASS\n');

console.log('=== ALL TIER 2 TESTS PASSED! ===');
await app.close();
await closePool();
process.exit(0);
