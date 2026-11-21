import { loadConfigOrExit } from '../src/config.ts';
import { getPool } from '../src/db.ts';
import { buildApp } from '../src/app.ts';

loadConfigOrExit(['pg', 'opensearch', 'api']);

const pool = getPool();
const app = await buildApp();

console.log('=== RUNNING TIER 3/4 SHOWPIECE BACKEND TESTS (t4-test) ===\n');

// 1. Setup a clean test customer and session
const sessionRes = await app.inject({
  method: 'POST',
  url: '/session',
  payload: { name: 'Kiosk Tester' },
});
if (sessionRes.statusCode !== 200) {
  throw new Error(`Failed to create session: ${sessionRes.body}`);
}
const session = JSON.parse(sessionRes.body);
const customerId = session.customer_id;
const token = session.token;

const headers = {
  'x-customer-id': String(customerId),
  'x-session-token': token,
};

// Clean test cart
await app.inject({
  method: 'DELETE',
  url: '/cart',
  headers,
});

// ==========================================
// Test 1: WRONG_BRANCH 409 on IN_STORE checkout
// ==========================================
console.log('--- Test 1: WRONG_BRANCH 409 on IN_STORE checkout ---');
// Add item from branch 2 to cart
const addB2Res = await app.inject({
  method: 'POST',
  url: '/cart/items',
  headers,
  payload: { product_id: 3, branch_id: 2, qty: 1 },
});
if (addB2Res.statusCode >= 400) {
  throw new Error(`Failed to add item for branch 2: ${addB2Res.body}`);
}

// Attempt checkout at branch 1 with IN_STORE
const wrongBranchRes = await app.inject({
  method: 'POST',
  url: '/checkout',
  headers: {
    ...headers,
    'idempotency-key': 'test-wrong-branch-' + Date.now(),
  },
  payload: {
    fulfilment: 'IN_STORE',
    branch_id: 1,
  },
});

console.log(`WRONG_BRANCH status: ${wrongBranchRes.statusCode}`);
if (wrongBranchRes.statusCode !== 409) {
  throw new Error(`Expected 409 WRONG_BRANCH, got ${wrongBranchRes.statusCode}: ${wrongBranchRes.body}`);
}
const wbBody = JSON.parse(wrongBranchRes.body);
if (wbBody.error?.code !== 'WRONG_BRANCH') {
  throw new Error(`Expected error code WRONG_BRANCH, got ${wbBody.error?.code}`);
}
if (!wbBody.error?.details?.wrong || wbBody.error.details.wrong.length === 0) {
  throw new Error(`Expected wrong branch details list, got: ${JSON.stringify(wbBody.error)}`);
}
console.log('PASS: WRONG_BRANCH 409 verified with details.\n');

// Clean cart
await app.inject({
  method: 'DELETE',
  url: '/cart',
  headers,
});

// ==========================================
// Test 2: IN_STORE checkout via /rescue/apply
// ==========================================
console.log('--- Test 2: IN_STORE checkout via /rescue/apply ---');
// Add Product 2 (0 stock everywhere) to cart at branch 1
const addP2Res = await app.inject({
  method: 'POST',
  url: '/cart/items',
  headers,
  payload: { product_id: 2, branch_id: 1, qty: 1 },
});
if (addP2Res.statusCode >= 400) {
  throw new Error(`Failed to add out of stock item: ${addP2Res.body}`);
}

// Attempt checkout -> should 409 OUT_OF_STOCK
const oosRes = await app.inject({
  method: 'POST',
  url: '/checkout',
  headers: {
    ...headers,
    'idempotency-key': 'test-oos-' + Date.now(),
  },
  payload: {
    fulfilment: 'IN_STORE',
    branch_id: 1,
  },
});

console.log(`OOS checkout status: ${oosRes.statusCode}`);
if (oosRes.statusCode !== 409) {
  throw new Error(`Expected 409 OUT_OF_STOCK, got ${oosRes.statusCode}: ${oosRes.body}`);
}
const oosBody = JSON.parse(oosRes.body);
if (oosBody.error?.code !== 'OUT_OF_STOCK') {
  throw new Error(`Expected error code OUT_OF_STOCK, got ${oosBody.error?.code}`);
}

// Apply rescue substitute (product 3) with fulfilment IN_STORE
const rescueRes = await app.inject({
  method: 'POST',
  url: '/rescue/apply',
  headers: {
    ...headers,
    'idempotency-key': 'test-rescue-' + Date.now(),
  },
  payload: {
    fulfilment: 'IN_STORE',
    branch_id: 1,
    choice: {
      type: 'SWAP',
      from: { product_id: 2, branch_id: 1 },
      to: { product_id: 3, branch_id: 1 },
    },
  },
});

console.log(`Rescue apply status: ${rescueRes.statusCode}`);
if (rescueRes.statusCode !== 201) {
  throw new Error(`Expected 201 from /rescue/apply, got ${rescueRes.statusCode}: ${rescueRes.body}`);
}
const rescueBody = JSON.parse(rescueRes.body);
if (rescueBody.order?.fulfilment !== 'IN_STORE') {
  throw new Error(`Expected fulfilment IN_STORE, got ${rescueBody.order?.fulfilment}`);
}
if (!rescueBody.order?.lines.some((l: any) => l.product_id === 3)) {
  throw new Error(`Expected substitute product 3 in order lines, got: ${JSON.stringify(rescueBody.order?.lines)}`);
}
console.log('PASS: IN_STORE checkout via /rescue/apply succeeded.\n');

// Clean up: cancel the placed hold
if (rescueBody.order?.id) {
  await app.inject({
    method: 'POST',
    url: `/orders/${rescueBody.order.id}/cancel`,
    headers,
  });
}

console.log('ALL t4-test BACKEND TESTS PASSED CLEANLY!\n');
await app.close();
await pool.end();
process.exit(0);
