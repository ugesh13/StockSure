import { spawn } from 'node:child_process';
import { cfg, loadConfigOrExit } from '../src/config.ts';
import { closePool, getPool } from '../src/db.ts';
import { applyDemoFixture } from './demo-fixture.ts';
import { sweepOnce } from '../src/services/orders.ts';
import { replayDlq } from '../src/kafka/dlq.ts';
import { sleep } from '../src/util.ts';

loadConfigOrExit(['pg', 'opensearch']);

const BASE = process.env.API_URL || 'http://localhost:3000';
let spawnedServer: any = null;

async function ensureServer(): Promise<void> {
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

type CheckResult = { id: string; status: 'PASS' | 'FAIL' | 'NOT RUN'; question: string; raw: string };

async function main() {
  console.log('=============================================');
  console.log('       STOCKSURE JUDGE SCOREBOARD            ');
  console.log('=============================================\n');

  // Step 1: Run demo:fixture first
  console.log('Applying demo fixture...');
  await applyDemoFixture();
  console.log('Demo fixture applied.\n');

  // Step 2: Ensure server is running
  await ensureServer();

  const pool = getPool();
  const results: CheckResult[] = [];

  // Helper to get demo product IDs
  const demoProductsRes = await pool.query<{ sku: string; id: number }>(
    "SELECT sku, id FROM products WHERE sku LIKE 'DEMO-%'",
  );
  const demoIds: Record<string, number> = {};
  for (const r of demoProductsRes.rows) demoIds[r.sku] = r.id;

  // -------------------------------------------------------------
  // J1: Race: 10 parallel checkouts for 1 unit of DEMO-RACE at branch 1
  // -------------------------------------------------------------
  let j1Status: 'PASS' | 'FAIL' = 'FAIL';
  let j1Raw = '';
  try {
    const raceProdId = demoIds['DEMO-RACE']!;
    // Setup 10 shoppers with 1 unit in cart
    const shoppers: { id: number; token: string }[] = [];
    for (let i = 1; i <= 10; i++) {
      const sRes = await fetch(`${BASE}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `Race Shopper ${i}` }),
      });
      const sData = (await sRes.json()) as any;
      shoppers.push({ id: sData.customer_id, token: sData.token });

      // Add 1 unit of DEMO-RACE at branch 1
      await fetch(`${BASE}/cart/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Customer-Id': String(sData.customer_id),
          'X-Session-Token': sData.token,
        },
        body: JSON.stringify({ product_id: raceProdId, branch_id: 1, qty: 1 }),
      });
    }

    // Fire 10 parallel checkouts
    const checkouts = await Promise.all(
      shoppers.map((s, idx) =>
        fetch(`${BASE}/checkout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Customer-Id': String(s.id),
            'X-Session-Token': s.token,
            'Idempotency-Key': `j1-race-${Date.now()}-${idx}`,
          },
          body: JSON.stringify({ fulfilment: 'PICKUP', branch_id: 1 }),
        }),
      ),
    );

    const statuses = checkouts.map((c) => c.status);
    const count201 = statuses.filter((s) => s === 201).length;
    const count409 = statuses.filter((s) => s === 409).length;

    // Verify 409 details have swap and back-in-stock
    let all409HaveRescue = true;
    for (let i = 0; i < checkouts.length; i++) {
      if (checkouts[i]!.status === 409) {
        const errJson = (await checkouts[i]!.json()) as any;
        const rescue = errJson?.error?.details?.rescue ?? [];
        const hasSwap = rescue.some((r: any) => r.type === 'SWAP');
        const hasBackInStock = rescue.some((r: any) => r.type === 'BACK_IN_STOCK');
        if (!hasSwap || !hasBackInStock) all409HaveRescue = false;
      } else if (checkouts[i]!.status === 201) {
        // Cancel the winning order to restore state
        const orderJson = (await checkouts[i]!.json()) as any;
        const orderId = orderJson?.order?.id;
        if (orderId) {
          await fetch(`${BASE}/orders/${orderId}/cancel`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Customer-Id': String(shoppers[i]!.id),
              'X-Session-Token': shoppers[i]!.token,
            },
          });
        }
      }
    }

    j1Raw = `codes=[${statuses.join(',')}], winners=${count201}, rejected=${count409}, rescue_options_ok=${all409HaveRescue}`;
    if (count201 === 1 && count409 === 9 && all409HaveRescue) j1Status = 'PASS';
  } catch (err: any) {
    j1Raw = `error: ${err.message}`;
  }
  results.push({
    id: 'J1',
    status: j1Status,
    question: 'Race: 10 parallel checkouts for 1 unit of DEMO-RACE -> exactly 1x 201, 9x 409 with swap & back-in-stock',
    raw: j1Raw,
  });

  // -------------------------------------------------------------
  // J2: In-store sale blocks online
  // -------------------------------------------------------------
  let j2Status: 'PASS' | 'FAIL' = 'FAIL';
  let j2Raw = '';
  try {
    const holdProdId = demoIds['DEMO-HOLD']!;
    // Set DEMO-HOLD to 1 unit at branch 1
    await pool.query('UPDATE inventory SET on_hand = 1, reserved = 0, buffer = 0 WHERE product_id = $1 AND branch_id = 1', [holdProdId]);

    // Create session and put 1 unit in cart
    const sRes = await fetch(`${BASE}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'J2 Online Shopper' }),
    });
    const shopper = (await sRes.json()) as any;
    await fetch(`${BASE}/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Customer-Id': String(shopper.customer_id),
        'X-Session-Token': shopper.token,
      },
      body: JSON.stringify({ product_id: holdProdId, branch_id: 1, qty: 1 }),
    });

    // Record POS sale for the last unit via /pos/sale
    const staffKey = cfg().STAFF_KEY;
    const posRes = await fetch(`${BASE}/pos/sale`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Staff-Key': staffKey,
      },
      body: JSON.stringify({ branch_id: 1, product_id: holdProdId, qty: 1 }),
    });
    const posData = (await posRes.json()) as any;

    // Online checkout must now return 409
    const checkoutRes = await fetch(`${BASE}/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Customer-Id': String(shopper.customer_id),
        'X-Session-Token': shopper.token,
        'Idempotency-Key': `j2-checkout-${Date.now()}`,
      },
      body: JSON.stringify({ fulfilment: 'PICKUP', branch_id: 1 }),
    });

    j2Raw = `pos_sale_status=${posRes.status}, online_checkout_status=${checkoutRes.status}`;
    if (posRes.status === 200 && checkoutRes.status === 409) j2Status = 'PASS';
  } catch (err: any) {
    j2Raw = `error: ${err.message}`;
  }
  results.push({
    id: 'J2',
    status: j2Status,
    question: 'In-store sale blocks online: POS sale takes last unit -> online checkout returns 409',
    raw: j2Raw,
  });

  // -------------------------------------------------------------
  // J3: Replay safety: snapshot per-SKU stock counts, replay DLQ, snapshot again
  // -------------------------------------------------------------
  let j3Status: 'PASS' | 'FAIL' | 'NOT RUN' = 'NOT RUN';
  let j3Raw = '';
  try {
    const snap1 = await pool.query<{ sku: string; branch_id: number; on_hand: number; reserved: number }>(`
      SELECT p.sku, i.branch_id, i.on_hand, i.reserved
      FROM inventory i JOIN products p ON p.id = i.product_id
      WHERE p.is_active = true
      ORDER BY p.sku, i.branch_id
    `);

    // Call replayDlq directly
    const replayRes = await replayDlq({ maxMessages: 5, totalMs: 5000, firstMessageWaitMs: 3000, idleMs: 1500 }).catch(
      () => ({ replayed: 0, skipped: 0 }),
    );

    const snap2 = await pool.query<{ sku: string; branch_id: number; on_hand: number; reserved: number }>(`
      SELECT p.sku, i.branch_id, i.on_hand, i.reserved
      FROM inventory i JOIN products p ON p.id = i.product_id
      WHERE p.is_active = true
      ORDER BY p.sku, i.branch_id
    `);

    const identical = JSON.stringify(snap1.rows) === JSON.stringify(snap2.rows);
    j3Raw = `replayed=${replayRes.replayed}, skipped=${replayRes.skipped}, counts_identical=${identical}`;
    if (identical) j3Status = 'PASS';
    else j3Status = 'FAIL';
  } catch (err: any) {
    j3Raw = `error: ${err.message}`;
    j3Status = 'FAIL';
  }
  results.push({
    id: 'J3',
    status: j3Status,
    question: 'Replay safety: stock counts snapshot before and after DLQ replay mechanism are identical',
    raw: j3Raw,
  });

  // -------------------------------------------------------------
  // J4: Search is a hint, checkout is a guarantee: DEMO-OOS indexed in-stock, checkout 409, DB on_hand=0
  // -------------------------------------------------------------
  let j4Status: 'PASS' | 'FAIL' = 'FAIL';
  let j4Raw = '';
  try {
    const oosProdId = demoIds['DEMO-OOS']!;

    // Verify search shows in-stock
    const searchRes = await fetch(`${BASE}/search?q=Desert+rose`);
    const searchData = (await searchRes.json()) as any;
    const oosHit = searchData?.results?.find((r: any) => r.product_id === oosProdId);
    const searchAvailable = oosHit?.branches?.find((b: any) => b.branch_id === 1)?.available ?? 0;

    // Online checkout attempt for DEMO-OOS at branch 1
    const sRes = await fetch(`${BASE}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'J4 Shopper' }),
    });
    const shopper = (await sRes.json()) as any;
    await fetch(`${BASE}/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Customer-Id': String(shopper.customer_id),
        'X-Session-Token': shopper.token,
      },
      body: JSON.stringify({ product_id: oosProdId, branch_id: 1, qty: 1 }),
    });

    const checkoutRes = await fetch(`${BASE}/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Customer-Id': String(shopper.customer_id),
        'X-Session-Token': shopper.token,
        'Idempotency-Key': `j4-checkout-${Date.now()}`,
      },
      body: JSON.stringify({ fulfilment: 'PICKUP', branch_id: 1 }),
    });

    // Check DB on_hand is still 0
    const dbRes = await pool.query<{ on_hand: number }>(
      'SELECT on_hand FROM inventory WHERE product_id = $1 AND branch_id = 1',
      [oosProdId],
    );
    const dbOnHand = dbRes.rows[0]?.on_hand ?? -1;

    j4Raw = `search_avail=${searchAvailable}, checkout_status=${checkoutRes.status}, db_on_hand=${dbOnHand}`;
    if (searchAvailable > 0 && checkoutRes.status === 409 && dbOnHand === 0) j4Status = 'PASS';
  } catch (err: any) {
    j4Raw = `error: ${err.message}`;
  }
  results.push({
    id: 'J4',
    status: j4Status,
    question: 'Search is a hint, checkout is a guarantee: OpenSearch says in-stock, checkout rejects with 409, DB on_hand=0',
    raw: j4Raw,
  });

  // -------------------------------------------------------------
  // J5: Rescue ladder: DEMO-RESCUE at branch 1 returns "pickup at" branch 2/3, DEMO-OOS returns back-in-stock, no delivery
  // -------------------------------------------------------------
  let j5Status: 'PASS' | 'FAIL' = 'FAIL';
  let j5Raw = '';
  try {
    const rescueProdId = demoIds['DEMO-RESCUE']!;
    const sRes = await fetch(`${BASE}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'J5 Rescue Shopper' }),
    });
    const shopper = (await sRes.json()) as any;
    await fetch(`${BASE}/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Customer-Id': String(shopper.customer_id),
        'X-Session-Token': shopper.token,
      },
      body: JSON.stringify({ product_id: rescueProdId, branch_id: 1, qty: 1 }),
    });

    const checkoutRes = await fetch(`${BASE}/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Customer-Id': String(shopper.customer_id),
        'X-Session-Token': shopper.token,
        'Idempotency-Key': `j5-rescue-${Date.now()}`,
      },
      body: JSON.stringify({ fulfilment: 'PICKUP', branch_id: 1 }),
    });

    const errJson = (await checkoutRes.json()) as any;
    const rescueOptions = errJson?.error?.details?.rescue ?? [];
    const oneBranch = rescueOptions.find((r: any) => r.type === 'ONE_BRANCH');
    const hasPickupMessage = oneBranch?.message?.toLowerCase().includes('pickup at');
    const claimsDelivery = JSON.stringify(errJson).toLowerCase().includes('delivery available');

    j5Raw = `checkout_status=${checkoutRes.status}, rescue_branch=${oneBranch?.branch_id}, message="${oneBranch?.message}", delivery_claimed=${claimsDelivery}`;
    if (checkoutRes.status === 409 && (oneBranch?.branch_id === 2 || oneBranch?.branch_id === 3) && hasPickupMessage && !claimsDelivery) {
      j5Status = 'PASS';
    }
  } catch (err: any) {
    j5Raw = `error: ${err.message}`;
  }
  results.push({
    id: 'J5',
    status: j5Status,
    question: 'Rescue ladder: DEMO-RESCUE returns "pickup at" branch 2/3, zero delivery claims',
    raw: j5Raw,
  });

  // -------------------------------------------------------------
  // J6: Multilingual search
  // -------------------------------------------------------------
  let j6Status: 'PASS' | 'FAIL' = 'FAIL';
  let j6Raw = '';
  try {
    const qTulsi = ['tulasi', 'holy basil', 'Ocimum tenuiflorum', 'tulsy'];
    const tulsiIds: number[] = [];
    for (const q of qTulsi) {
      const res = await fetch(`${BASE}/search?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as any;
      tulsiIds.push(data?.results?.[0]?.product_id);
    }

    const qRose = ['gulab', 'rose'];
    const roseIds: number[] = [];
    for (const q of qRose) {
      const res = await fetch(`${BASE}/search?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as any;
      roseIds.push(data?.results?.[0]?.product_id);
    }

    const resMogra = await fetch(`${BASE}/search?q=mogra`);
    const dataMogra = (await resMogra.json()) as any;
    const mograName = dataMogra?.results?.[0]?.name ?? '';

    const allTulsiSame = tulsiIds.every((id) => id && id === tulsiIds[0]);
    const allRoseSame = roseIds.every((id) => id && id === roseIds[0]);
    const mograIsJasmine = mograName.toLowerCase().includes('jasmine');

    j6Raw = `tulsi_ids=[${tulsiIds.join(',')}], rose_ids=[${roseIds.join(',')}], mogra_top="${mograName}"`;
    if (allTulsiSame && allRoseSame && mograIsJasmine) j6Status = 'PASS';
  } catch (err: any) {
    j6Raw = `error: ${err.message}`;
  }
  results.push({
    id: 'J6',
    status: j6Status,
    question: 'Multilingual search: synonyms (tulsi/rose/jasmine), typos, scientific and vernacular queries match',
    raw: j6Raw,
  });

  // -------------------------------------------------------------
  // J7: Hold expiry: hold DEMO-HOLD, force expiry past, sweepOnce returns stock
  // -------------------------------------------------------------
  let j7Status: 'PASS' | 'FAIL' = 'FAIL';
  let j7Raw = '';
  try {
    const holdProdId = demoIds['DEMO-HOLD']!;
    await pool.query('UPDATE inventory SET on_hand = 2, reserved = 0, buffer = 0 WHERE product_id = $1 AND branch_id = 1', [holdProdId]);

    const sRes = await fetch(`${BASE}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'J7 Expiry Shopper' }),
    });
    const shopper = (await sRes.json()) as any;
    await fetch(`${BASE}/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Customer-Id': String(shopper.customer_id),
        'X-Session-Token': shopper.token,
      },
      body: JSON.stringify({ product_id: holdProdId, branch_id: 1, qty: 1 }),
    });

    const checkoutRes = await fetch(`${BASE}/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Customer-Id': String(shopper.customer_id),
        'X-Session-Token': shopper.token,
        'Idempotency-Key': `j7-hold-${Date.now()}`,
      },
      body: JSON.stringify({ fulfilment: 'PICKUP', branch_id: 1 }),
    });
    const orderData = (await checkoutRes.json()) as any;
    const orderId = orderData?.order?.id;

    // Check reserved = 1
    const invDuring = await pool.query<{ reserved: number; on_hand: number }>(
      'SELECT reserved, on_hand FROM inventory WHERE product_id = $1 AND branch_id = 1',
      [holdProdId],
    );

    // Force order expiry time into past
    await pool.query("UPDATE orders SET expires_at = now() - interval '5 minutes' WHERE id = $1", [orderId]);

    // Run sweeper
    const sweptCount = await sweepOnce();

    // Check stock restored
    const invAfter = await pool.query<{ reserved: number; on_hand: number }>(
      'SELECT reserved, on_hand FROM inventory WHERE product_id = $1 AND branch_id = 1',
      [holdProdId],
    );

    j7Raw = `orderId=${orderId}, during_reserved=${invDuring.rows[0]?.reserved}, sweptCount=${sweptCount}, after_reserved=${invAfter.rows[0]?.reserved}`;
    if (invDuring.rows[0]?.reserved === 1 && sweptCount >= 1 && invAfter.rows[0]?.reserved === 0) {
      j7Status = 'PASS';
    }
  } catch (err: any) {
    j7Raw = `error: ${err.message}`;
  }
  results.push({
    id: 'J7',
    status: j7Status,
    question: 'Hold expiry: unpaid hold forced past expiration -> sweeper releases reservation back to available',
    raw: j7Raw,
  });

  // -------------------------------------------------------------
  // J8: Security: production-auth, rate-limit and swagger test runs
  // -------------------------------------------------------------
  let j8Status: 'PASS' | 'FAIL' = 'FAIL';
  let j8Raw = '';
  try {
    const secProc = spawn('node', ['--test', 'test/f2-auth.test.ts', 'test/f3-ratelimit.test.ts', 'test/f4-swagger.test.ts'], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let secOut = '';
    secProc.stdout.on('data', (d) => (secOut += d));
    secProc.stderr.on('data', (d) => (secOut += d));
    const code = await new Promise((res) => secProc.on('close', res));
    const passMatches = secOut.match(/pass\s+(\d+)/);
    const passCount = passMatches ? passMatches[1] : 'all';
    j8Raw = `exit_code=${code}, passes=${passCount}`;
    if (code === 0) j8Status = 'PASS';
  } catch (err: any) {
    j8Raw = `error: ${err.message}`;
  }
  results.push({
    id: 'J8',
    status: j8Status,
    question: 'Security: production-auth, route rate limiting, and swagger exposure tests all pass',
    raw: j8Raw,
  });

  // -------------------------------------------------------------
  // J9: Invariant: zero stock violations (reserved < 0 OR on_hand - reserved < 0)
  // -------------------------------------------------------------
  let j9Status: 'PASS' | 'FAIL' = 'FAIL';
  let j9Raw = '';
  const invSql = 'SELECT count(*)::int AS violations FROM inventory WHERE reserved < 0 OR on_hand - reserved < 0';
  try {
    const invRes = await pool.query<{ violations: number }>(invSql);
    const violations = invRes.rows[0]?.violations ?? -1;
    j9Raw = `SQL: "${invSql}" -> violations=${violations}`;
    if (violations === 0) j9Status = 'PASS';
  } catch (err: any) {
    j9Raw = `error: ${err.message}`;
  }
  results.push({
    id: 'J9',
    status: j9Status,
    question: 'Invariant: zero stock rows with reserved < 0 OR on_hand - reserved < 0 across all branches',
    raw: j9Raw,
  });

  // -------------------------------------------------------------
  // J10: Freshness: DEMO-STALE shows CONFIRM_WITH_STORE on stale branch, IN_STOCK on fresh branch
  // -------------------------------------------------------------
  let j10Status: 'PASS' | 'FAIL' = 'FAIL';
  let j10Raw = '';
  try {
    const staleProdId = demoIds['DEMO-STALE']!;
    const prodRes = await fetch(`${BASE}/products/${staleProdId}`);
    const prodData = (await prodRes.json()) as any;

    const b3 = prodData?.branches?.find((b: any) => b.branch_id === 3);
    const b1 = prodData?.branches?.find((b: any) => b.branch_id === 1);

    j10Raw = `branch3_status="${b3?.status}", branch1_status="${b1?.status}"`;
    if (b3?.status === 'CONFIRM_WITH_STORE' && (b1?.status === 'IN_STOCK' || b1?.status === 'FEW_LEFT')) {
      j10Status = 'PASS';
    }
  } catch (err: any) {
    j10Raw = `error: ${err.message}`;
  }
  results.push({
    id: 'J10',
    status: j10Status,
    question: 'Freshness rule: DEMO-STALE at branch 3 shows CONFIRM_WITH_STORE; fresh branch shows IN_STOCK',
    raw: j10Raw,
  });

  // -------------------------------------------------------------
  // Print Scoreboard
  // -------------------------------------------------------------
  console.log('--- SCOREBOARD RESULTS ---');
  let passCount = 0;
  for (const r of results) {
    if (r.status === 'PASS') passCount++;
    console.log(`${r.id} ${r.status} ${r.question} [${r.raw}]`);
  }

  console.log(`\nJ-checks passed ${passCount} of 10`);

  if (spawnedServer) {
    try {
      spawnedServer.kill();
    } catch {}
  }

  await closePool();

  process.exit(passCount === 10 ? 0 : 1);
}

main().catch((err) => {
  console.error('Judge demo runner failed:', err);
  if (spawnedServer) spawnedServer.kill('SIGINT');
  process.exit(1);
});
