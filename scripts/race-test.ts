// Race tests against a running API (HTTP only, so it tests exactly what the website uses).
//   npm run race-test            runs T1 and T2
//   npm run race-test -- t1      only T1: 10 parallel checkouts for 1 unit
//   npm run race-test -- t2      only T2: 5 checkouts for a product with 0 stock
// Needs the seeded demo products: #1 has exactly 1 unit at branch 1, #2 has none anywhere, #3 is the rescue.
const API = (process.env.API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const which = process.argv[2] ?? 'all';
const runId = Date.now().toString(36);

type Res = { status: number; json: any };

async function call(path: string, o: { method?: string; customer: number; key?: string; body?: unknown }): Promise<Res> {
  const res = await fetch(API + path, {
    method: o.method ?? 'GET',
    headers: {
      ...(o.body !== undefined ? { 'content-type': 'application/json' } : {}),
      'x-customer-id': String(o.customer),
      ...(o.key ? { 'idempotency-key': o.key } : {}),
    },
    body: o.body === undefined ? undefined : JSON.stringify(o.body),
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

async function availableAt(productId: number, branchId: number): Promise<number> {
  const r = await call(`/products/${productId}`, { customer: 1 });
  return r.json.branches?.find((b: any) => b.branch_id === branchId)?.available ?? -1;
}

async function loadCart(customer: number, productId: number, branchId: number): Promise<void> {
  await call('/cart', { method: 'DELETE', customer });
  const r = await call('/cart/items', { method: 'POST', customer, body: { product_id: productId, branch_id: branchId, qty: 1 } });
  if (r.status !== 201) throw new Error(`could not fill cart for customer ${customer}: ${r.status} ${JSON.stringify(r.json)}`);
}

let failures = 0;
function expect(label: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
  if (!ok) failures++;
}

async function t1(): Promise<void> {
  console.log('\nT1: 10 parallel checkouts for 1 unit (product 1, branch 1)');
  const N = 10;
  const before = await availableAt(1, 1);
  if (before !== 1) {
    console.log(`SKIP  product 1 at branch 1 shows ${before} available (needs exactly 1). A hold from an earlier run lasts until it expires or is cancelled.`);
    failures++;
    return;
  }
  const customers = Array.from({ length: N }, (_, i) => i + 1);
  for (const c of customers) await loadCart(c, 1, 1);

  const results = await Promise.all(customers.map((c) => call('/checkout', { method: 'POST', customer: c, key: `race-${runId}-${c}`, body: { fulfilment: 'PICKUP' } })));
  const won = results.map((r, i) => ({ r, customer: customers[i]! })).filter((x) => x.r.status === 201);
  const lost = results.filter((r) => r.status === 409);
  expect('exactly 1 order created (201)', won.length === 1, `got ${won.length}`);
  expect('9 rejected (409)', lost.length === N - 1, `got ${lost.length}`);
  expect('every rejection carries a rescue option', lost.every((r) => (r.json.error?.details?.rescue?.length ?? 0) > 0));
  expect('stock never below zero', (await availableAt(1, 1)) === 0);

  const winner = won[0];
  if (winner) {
    const again = await call('/checkout', { method: 'POST', customer: winner.customer, key: `race-${runId}-${winner.customer}`, body: { fulfilment: 'PICKUP' } });
    expect('same Idempotency-Key returns the same order (no second order)', again.status === 200 && again.json.order?.id === winner.r.json.order?.id);
    await call(`/orders/${winner.r.json.order.id}/cancel`, { method: 'POST', customer: winner.customer });
    expect('cancelling the winner returns the unit to sale', (await availableAt(1, 1)) === 1);
  }
}

async function t2(): Promise<void> {
  console.log('\nT2: 5 checkouts for a product with 0 stock (product 2, branch 1)');
  const customers = [11, 12, 13, 14, 15];
  for (const c of customers) await loadCart(c, 2, 1);
  const results = await Promise.all(customers.map((c) => call('/checkout', { method: 'POST', customer: c, key: `zero-${runId}-${c}`, body: { fulfilment: 'PICKUP' } })));
  expect('all 5 rejected (409)', results.every((r) => r.status === 409), results.map((r) => r.status).join(','));
  expect(
    'each rejection offers a swap and a back-in-stock alert',
    results.every((r) => {
      const types: string[] = (r.json.error?.details?.rescue ?? []).map((o: any) => o.type);
      return types.includes('SWAP') && types.includes('BACK_IN_STOCK');
    }),
  );
  for (const c of customers) await call('/cart', { method: 'DELETE', customer: c });
}

try {
  const health = await fetch(API + '/health').catch(() => null);
  if (!health) throw new Error(`API not reachable at ${API}. Start it with npm start.`);
  if (which === 'all' || which === 't1') await t1();
  if (which === 'all' || which === 't2') await t2();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  failures++;
}
console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
