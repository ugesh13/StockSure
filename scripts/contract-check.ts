import { z } from 'zod';
import { spawn } from 'node:child_process';
import { sleep } from '../src/util.ts';

const BASE = process.env.API_URL || 'http://localhost:3000';

let spawnedServer: any = null;

async function ensureServer() {
  try {
    const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) return;
  } catch {}

  console.log(`Server not responding on ${BASE}, launching server process...`);
  spawnedServer = spawn('node', ['--env-file-if-exists=.env', 'src/server.ts'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  spawnedServer.stderr.on('data', (d: Buffer) => {
    const s = d.toString();
    if (!s.includes('KafkaJS')) console.error('[server stderr]', s.trim());
  });

  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    try {
      const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        console.log('Server is up and healthy.');
        return;
      }
    } catch {}
  }
  throw new Error('Server failed to start within 30 seconds');
}

// ZOD SCHEMAS FOR CONTRACT VALIDATION
const BranchesSchema = z.object({
  branches: z
    .array(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1),
        city: z.string().min(1),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        stock_confirmed: z.boolean(),
        last_heartbeat_at: z.string(),
      }),
    )
    .length(12),
});

const LayoutSchema = z.object({
  branch: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    city: z.string(),
    stock_confirmed: z.boolean(),
  }),
  layout: z.object({
    width_m: z.number().positive(),
    depth_m: z.number().positive(),
    entrance: z.object({ x: z.number(), z: z.number() }),
    kiosk: z.object({ x: z.number(), z: z.number() }),
    staff_desk: z.object({ x: z.number(), z: z.number() }),
    gondola: z.object({
      x1: z.number(),
      x2: z.number(),
      depth_m: z.number(),
      bays: z.number(),
      levels: z.number(),
      level_heights_m: z.array(z.number()),
    }),
    aisles: z.array(
      z.object({
        code: z.string(),
        label: z.string(),
        category: z.string(),
        z: z.number(),
      }),
    ),
  }),
});

const ShelvesSchema = z.object({
  as_of: z.string(),
  branch: z.object({
    id: z.number().int().positive(),
    stock_confirmed: z.boolean(),
    last_heartbeat_at: z.string(),
  }),
  items: z.array(
    z.object({
      product_id: z.number(),
      name: z.string(),
      brand: z.string(),
      category: z.string(),
      price_paise: z.number().positive(),
      aisle: z.string(),
      bay: z.number(),
      level: z.number(),
      slot: z.number(),
      x: z.number(),
      y: z.number(),
      z: z.number(),
      stand: z.object({ x: z.number(), z: z.number() }),
      available: z.number(),
      status: z.string(),
      rev: z.number(),
      updated_at: z.string(),
    }),
  ),
});

const CartCodeSchema = z.object({
  code: z.string().length(8),
});

const KioskCartSchema = z.object({
  customer_id: z.number(),
  customer_name: z.string(),
  lines: z.array(
    z.object({
      product_id: z.number(),
      name: z.string(),
      brand: z.string(),
      price_paise: z.number(),
      branch_id: z.number(),
      qty: z.number(),
      available: z.number(),
      at_this_branch: z.boolean(),
    }),
  ),
  total_paise: z.number(),
});

const PipelineSchema = z.object({
  healthy: z.boolean(),
  outbox_pending: z.number(),
  awaiting_finalizer: z.number(),
  awaiting_finalizer_oldest_s: z.number(),
  last_processed: z.array(
    z.object({
      consumer: z.string(),
      last_processed_at: z.string(),
    }),
  ),
});

const RequestsSchema = z.object({
  id: z.number().positive(),
});

const SessionSchema = z.object({
  customer_id: z.number().positive(),
  token: z.string().length(64),
  name: z.string().nullable(),
});

console.log('=== CONTRACT CHECK STARTING ===\n');

try {
  await ensureServer();

  let passCount = 0;

  // 1. GET /branches
  console.log('1. Checking GET /branches...');
  const resBranches = await fetch(`${BASE}/branches`);
  if (!resBranches.ok) throw new Error(`GET /branches returned ${resBranches.status}`);
  const branchesJson = await resBranches.json();
  BranchesSchema.parse(branchesJson);
  console.log(`   PASS (12 branches with lat/lng/stock_confirmed validated)`);
  passCount++;

  // 2. GET /branches/1/layout
  console.log('2. Checking GET /branches/1/layout...');
  const resLayout = await fetch(`${BASE}/branches/1/layout`);
  if (!resLayout.ok) throw new Error(`GET /branches/1/layout returned ${resLayout.status}`);
  const layoutJson = await resLayout.json();
  LayoutSchema.parse(layoutJson);
  console.log(`   PASS (layout dimensions, gondola, entrance, kiosk, aisles validated)`);
  passCount++;

  // 3. GET /branches/1/shelves
  console.log('3. Checking GET /branches/1/shelves...');
  const resShelves = await fetch(`${BASE}/branches/1/shelves`);
  if (!resShelves.ok) throw new Error(`GET /branches/1/shelves returned ${resShelves.status}`);
  const shelvesJson = await resShelves.json();
  ShelvesSchema.parse(shelvesJson);
  console.log(`   PASS (shelves items and stand coordinates validated)`);
  passCount++;

  // 4. POST /session
  console.log('4. Checking POST /session...');
  const resSession = await fetch(`${BASE}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Contract Test Shopper' }),
  });
  if (!resSession.ok) throw new Error(`POST /session returned ${resSession.status}`);
  const sessionJson = await resSession.json();
  SessionSchema.parse(sessionJson);
  console.log(`   PASS (session customer_id, 32-byte hex token, and name validated)`);
  passCount++;

  // 5. POST /cart/code & GET /kiosk/cart/:code
  console.log('5. Checking POST /cart/code and GET /kiosk/cart/:code...');
  // Add an item to cart first
  await fetch(`${BASE}/cart/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Customer-Id': String(sessionJson.customer_id),
      'X-Session-Token': sessionJson.token,
    },
    body: JSON.stringify({ product_id: 3, branch_id: 1, qty: 2 }),
  });

  const resCode = await fetch(`${BASE}/cart/code`, {
    method: 'POST',
    headers: {
      'X-Customer-Id': String(sessionJson.customer_id),
      'X-Session-Token': sessionJson.token,
    },
  });
  if (!resCode.ok) throw new Error(`POST /cart/code returned ${resCode.status}`);
  const codeJson = await resCode.json();
  CartCodeSchema.parse(codeJson);

  const resKiosk = await fetch(`${BASE}/kiosk/cart/${codeJson.code}?branch_id=1`);
  if (!resKiosk.ok) throw new Error(`GET /kiosk/cart/${codeJson.code} returned ${resKiosk.status}`);
  const kioskJson = await resKiosk.json();
  KioskCartSchema.parse(kioskJson);
  console.log(`   PASS (kiosk cart code generated and redeemed with line branch flags)`);
  passCount++;

  // 6. POST /checkout with fulfilment: IN_STORE
  console.log('6. Checking POST /checkout with fulfilment IN_STORE...');
  const resCheckout = await fetch(`${BASE}/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Customer-Id': String(sessionJson.customer_id),
      'X-Session-Token': sessionJson.token,
      'Idempotency-Key': `contract-check-${Date.now()}`,
    },
    body: JSON.stringify({ fulfilment: 'IN_STORE', branch_id: 1 }),
  });
  if (resCheckout.status !== 201 && resCheckout.status !== 200) {
    throw new Error(`IN_STORE checkout failed with status ${resCheckout.status}: ${await resCheckout.text()}`);
  }
  console.log(`   PASS (IN_STORE checkout succeeded)`);
  passCount++;

  // 7. GET /demo/pipeline
  console.log('7. Checking GET /demo/pipeline...');
  const resPipeline = await fetch(`${BASE}/demo/pipeline`);
  if (!resPipeline.ok) throw new Error(`GET /demo/pipeline returned ${resPipeline.status}`);
  const pipelineJson = await resPipeline.json();
  PipelineSchema.parse(pipelineJson);
  console.log(`   PASS (pipeline health, outbox, awaiting finalizer, and consumers validated)`);
  passCount++;

  // 8. POST /requests
  console.log('8. Checking POST /requests...');
  const resRequests = await fetch(`${BASE}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'gaming mechanical keyboard' }),
  });
  if (!resRequests.ok) throw new Error(`POST /requests returned ${resRequests.status}`);
  const reqJson = await resRequests.json();
  RequestsSchema.parse(reqJson);
  console.log(`   PASS (product request recorded with id=${reqJson.id})`);
  passCount++;

  console.log(`\nALL ${passCount} CONTRACT CHECKS PASSED WITH ZERO FAILURES!`);
} finally {
  if (spawnedServer) {
    spawnedServer.kill('SIGINT');
  }
}

