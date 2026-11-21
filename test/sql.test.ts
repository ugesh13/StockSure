import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import * as Q from '../src/sql.ts';

// SQL contract tests: run the real statements from src/sql.ts against a real Postgres, with real concurrent sessions.
// Needs the `psql` client and TEST_PG_URL (a Postgres you can write to). Everything happens in a throwaway schema
// that is dropped at the end; your real tables are never touched.
//   TEST_PG_URL=postgresql://user@127.0.0.1:5432/ss_test npm run test:sql
const URL = process.env.TEST_PG_URL;
const SKIP = URL ? false : 'set TEST_PG_URL to run the SQL tests';
const SCHEMA = `t_${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
const HERE = dirname(fileURLToPath(import.meta.url));

type Out = { rows: string[][]; err: string; code: number };

function sh(script: string): Promise<Out> {
  return new Promise((resolve, reject) => {
    const p = spawn('psql', [URL!, '-X', '-q', '-A', '-t', '-F', '|', '-v', 'ON_ERROR_STOP=1'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('error', reject);
    p.on('close', (code) => resolve({ rows: out.split('\n').filter(Boolean).map((l) => l.split('|')), err, code: code ?? 1 }));
    p.stdin.end(`SET search_path TO ${SCHEMA}, public;\n${script}`);
  });
}

async function ok(script: string): Promise<string[][]> {
  const r = await sh(script);
  assert.equal(r.code, 0, `psql failed: ${r.err}\n${script.slice(0, 300)}`);
  return r.rows;
}

const prep = (name: string, sql: string) => `PREPARE ${name} AS ${sql};\n`;

const FIXTURE = `
TRUNCATE inventory, stock_ledger, order_lines, orders, outbox, processed_events, cart_items, carts, products, branches, customers RESTART IDENTITY CASCADE;
INSERT INTO branches (id, name, city) VALUES (1,'B1','Bengaluru'),(2,'B2','Bengaluru'),(3,'B3','Mumbai');
INSERT INTO customers (id, name, email) VALUES (1,'c1','c1@x.test'),(2,'c2','c2@x.test');
INSERT INTO products (id, sku, name, brand, category, tags, price_paise) VALUES
 (1,'S1','Sonara Pulse X1 Bluetooth Earphones','Sonara','audio','{earphones,earbuds,wireless,bluetooth}',249900),
 (2,'S2','Voltix Beat Z2 Bluetooth Earphones','Voltix','audio','{earphones,earbuds,wireless,bluetooth}',259900),
 (3,'S3','Nimbus Air 3 Bluetooth Earphones','Nimbus','audio','{earphones,earbuds,wireless,bluetooth}',269900),
 (4,'S4','Kestrel Apex 200 Laptop 14-inch','Kestrel','computing','{laptop,notebook}',4999900),
 (5,'S5','Tavro Drift 300 Wireless Mouse','Tavro','computing','{mouse,wireless}',69900);
INSERT INTO inventory (branch_id, product_id, on_hand, buffer) VALUES
 (1,1,1,0),(2,1,0,0),(3,1,4,0),
 (1,2,0,0),(2,2,0,0),(3,2,0,0),
 (1,3,25,0),(2,3,25,0),(3,3,25,0),
 (1,4,10,0),(2,4,10,0),(3,4,10,0),
 (1,5,5,0),(2,5,5,0),(3,5,5,0);
`;

before(async () => {
  if (SKIP) return;
  await ok(`CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA public; CREATE SCHEMA ${SCHEMA};`);
  await ok(readFileSync(join(HERE, '..', 'sql', '001_schema.sql'), 'utf8'));
});

after(async () => {
  if (SKIP) return;
  await ok(`DROP SCHEMA ${SCHEMA} CASCADE;`);
});

test('schema applies cleanly and the table rules reject bad data', { skip: SKIP }, async () => {
  await ok(FIXTURE);
  const bad = async (sql: string) => assert.notEqual((await sh(sql)).code, 0, sql);
  await bad('UPDATE inventory SET reserved = -1 WHERE branch_id = 1 AND product_id = 1;'); // reserved >= 0
  await bad('UPDATE inventory SET on_hand = -1 WHERE branch_id = 1 AND product_id = 1;'); // on_hand >= 0
  await bad(`INSERT INTO cart_items (cart_id, product_id, branch_id, qty) VALUES (1, 1, 1, 11);`); // qty 1..10 (also no cart: FK)
  await bad(`INSERT INTO products (id, sku, name, brand, category, price_paise) VALUES (99,'X','x','x','x',0);`); // price > 0
});

test('T1 race: 10 parallel buyers for 1 unit -> exactly 1 wins, stock never below zero', { skip: SKIP }, async () => {
  await ok(FIXTURE);
  const buyer = () =>
    sh(`BEGIN;\n${prep('r', Q.RESERVE_SQL)}EXECUTE r(1, 1, 1);\nSELECT pg_sleep(0.25);\nCOMMIT;`);
  const results = await Promise.all(Array.from({ length: 10 }, buyer));
  for (const r of results) assert.equal(r.code, 0, r.err);
  const winners = results.filter((r) => r.rows.length > 0).length;
  assert.equal(winners, 1, `winners: ${winners}`);
  const [row] = await ok('SELECT on_hand, reserved, buffer, rev FROM inventory WHERE branch_id = 1 AND product_id = 1;');
  assert.deepEqual(row, ['1', '1', '0', '1']); // one reservation, one revision
});

test('race with quantities: 4 buyers want 2 each from 5 units -> 2 win, available never negative', { skip: SKIP }, async () => {
  await ok(FIXTURE + 'UPDATE inventory SET on_hand = 5 WHERE branch_id = 1 AND product_id = 1;');
  const buyer = () => sh(`BEGIN;\n${prep('r', Q.RESERVE_SQL)}EXECUTE r(1, 1, 2);\nSELECT pg_sleep(0.2);\nCOMMIT;`);
  const results = await Promise.all(Array.from({ length: 4 }, buyer));
  assert.equal(results.filter((r) => r.rows.length > 0).length, 2);
  const [row] = await ok('SELECT on_hand - reserved - buffer FROM inventory WHERE branch_id = 1 AND product_id = 1;');
  assert.deepEqual(row, ['1']);
});

test('buffer trap: with buffer 1 the last unit cannot be sold online', { skip: SKIP }, async () => {
  await ok(FIXTURE + 'UPDATE inventory SET buffer = 1 WHERE branch_id = 1 AND product_id = 1;');
  const rows = await ok(`${prep('r', Q.RESERVE_SQL)}EXECUTE r(1, 1, 1);`);
  assert.equal(rows.length, 0);
});

test('multi-line carts reserved in sorted order: 8 concurrent checkouts, no deadlock, nothing lost', { skip: SKIP }, async () => {
  await ok(FIXTURE);
  // lines (branch, product) already in the global order: (1,3) (1,4) (2,3) (2,4)
  const lines = [[1, 3], [1, 4], [2, 3], [2, 4]] as const;
  const checkout = () =>
    sh(
      `BEGIN;\n${prep('r', Q.RESERVE_SQL)}` +
        lines.map(([b, p]) => `EXECUTE r(${b}, ${p}, 1);\nSELECT pg_sleep(0.02);`).join('\n') +
        `\nCOMMIT;`,
    );
  const results = await Promise.all(Array.from({ length: 8 }, checkout));
  for (const r of results) {
    assert.equal(r.code, 0, `deadlock or error: ${r.err}`);
    assert.equal(r.rows.length, 4); // every line reserved
  }
  const rows = await ok('SELECT branch_id, product_id, reserved FROM inventory WHERE product_id IN (3, 4) ORDER BY 1, 2;');
  for (const [b, p, reserved] of rows) {
    const expected = (b === '1' || b === '2') ? '8' : '0';
    assert.equal(reserved, expected, `branch ${b} product ${p}`);
  }
});

test('idempotency: the same key inserts one order, the second insert returns nothing', { skip: SKIP }, async () => {
  await ok(FIXTURE);
  const first = await ok(`${prep('o', Q.INSERT_ORDER_SQL)}EXECUTE o(1, 249900, 'PICKUP', 'key-0001', 10);`);
  const second = await ok(`${prep('o', Q.INSERT_ORDER_SQL)}EXECUTE o(1, 249900, 'PICKUP', 'key-0001', 10);`);
  assert.equal(first.length, 1);
  assert.equal(second.length, 0);
  // concurrent double click: one row, no error
  const [a, b] = await Promise.all([
    sh(`${prep('o', Q.INSERT_ORDER_SQL)}EXECUTE o(2, 100, 'PICKUP', 'key-race-1', 10);`),
    sh(`${prep('o', Q.INSERT_ORDER_SQL)}EXECUTE o(2, 100, 'PICKUP', 'key-race-1', 10);`),
  ]);
  assert.equal(a.code + b.code, 0);
  assert.equal(a.rows.length + b.rows.length, 1);
});

test('pay: only an unexpired AWAITING_PAYMENT order of the right customer can be placed, once', { skip: SKIP }, async () => {
  await ok(FIXTURE);
  await ok(`INSERT INTO orders (id, customer_id, status, total_paise, fulfilment, idempotency_key, expires_at) VALUES
    ('00000000-0000-0000-0000-000000000001', 1, 'AWAITING_PAYMENT', 100, 'PICKUP', 'k1', now() + interval '5 minutes'),
    ('00000000-0000-0000-0000-000000000002', 1, 'AWAITING_PAYMENT', 100, 'PICKUP', 'k2', now() - interval '1 minute');`);
  const pay = (id: string, customer: number) => ok(`${prep('p', Q.PAY_SQL)}EXECUTE p('${id}', ${customer});`);
  assert.equal((await pay('00000000-0000-0000-0000-000000000001', 2)).length, 0); // someone else's order
  assert.equal((await pay('00000000-0000-0000-0000-000000000002', 1)).length, 0); // hold expired
  assert.equal((await pay('00000000-0000-0000-0000-000000000001', 1)).length, 1); // placed
  assert.equal((await pay('00000000-0000-0000-0000-000000000001', 1)).length, 0); // second pay changes nothing
});

test('expiry sweeper query finds only expired unpaid orders', { skip: SKIP }, async () => {
  await ok(FIXTURE);
  await ok(`INSERT INTO orders (id, customer_id, status, total_paise, fulfilment, idempotency_key, expires_at) VALUES
    ('00000000-0000-0000-0000-000000000011', 1, 'AWAITING_PAYMENT', 1, 'PICKUP', 'e1', now() - interval '1 minute'),
    ('00000000-0000-0000-0000-000000000012', 1, 'AWAITING_PAYMENT', 1, 'PICKUP', 'e2', now() + interval '5 minutes'),
    ('00000000-0000-0000-0000-000000000013', 1, 'PLACED', 1, 'PICKUP', 'e3', now() - interval '1 minute');`);
  const rows = await ok(`BEGIN;\n${prep('s', Q.EXPIRED_NEXT_SQL)}EXECUTE s;\nCOMMIT;`);
  assert.deepEqual(rows, [['00000000-0000-0000-0000-000000000011']]);
});

test('outbox relay: SKIP LOCKED means two relays never take the same rows; mark stores partition and offset', { skip: SKIP }, async () => {
  await ok(FIXTURE + `INSERT INTO outbox (topic, key, payload) SELECT 'orders', 'k' || g, '{"event_id":"x"}' FROM generate_series(1, 3) g;`);
  const a = sh(`BEGIN;\n${prep('r', Q.RELAY_SELECT_SQL)}EXECUTE r;\nSELECT pg_sleep(1);\nCOMMIT;`);
  await new Promise((r) => setTimeout(r, 400));
  const b = await sh(`BEGIN;\n${prep('r', Q.RELAY_SELECT_SQL)}EXECUTE r;\nCOMMIT;`);
  const ra = await a;
  assert.equal(ra.rows.length, 3);
  assert.equal(b.rows.length, 0); // locked by relay A, skipped by relay B

  await ok(`${prep('m', Q.RELAY_MARK_SQL)}EXECUTE m('{1,2,3}', '{0,1,0}', '{10,11,12}');`);
  const rows = await ok('SELECT id, kafka_partition, kafka_offset, (published_at IS NOT NULL), attempts FROM outbox ORDER BY id;');
  assert.deepEqual(rows, [['1', '0', '10', 't', '1'], ['2', '1', '11', 't', '1'], ['3', '0', '12', 't', '1']]);
  assert.equal((await ok(`${prep('r', Q.RELAY_SELECT_SQL)}EXECUTE r;`)).length, 0); // nothing pending any more
});

test('processed_events: the same event cannot be claimed twice (duplicate-safe consumers)', { skip: SKIP }, async () => {
  await ok(FIXTURE);
  const claim = `WITH ins AS (${Q.CLAIM_EVENT_SQL} RETURNING 1) SELECT count(*) FROM ins`;
  const run = () => ok(`${prep('c', claim)}EXECUTE c('inventory-finalizer', '8d3f6a52-3b8f-4f1e-9a53-0d4d4f9f1d10');`);
  assert.deepEqual(await run(), [['1']]);
  assert.deepEqual(await run(), [['0']]); // duplicate: ignored
});

test('conflict check: newest unpaid hold on an item is released first', { skip: SKIP }, async () => {
  await ok(FIXTURE);
  await ok(`INSERT INTO orders (id, customer_id, status, total_paise, fulfilment, idempotency_key, expires_at, created_at) VALUES
    ('00000000-0000-0000-0000-0000000000a1', 1, 'AWAITING_PAYMENT', 1, 'PICKUP', 'a1', now() + interval '9 minutes', now() - interval '3 minutes'),
    ('00000000-0000-0000-0000-0000000000a2', 2, 'AWAITING_PAYMENT', 1, 'PICKUP', 'a2', now() + interval '9 minutes', now() - interval '1 minute'),
    ('00000000-0000-0000-0000-0000000000a3', 2, 'PLACED',           1, 'PICKUP', 'a3', null, now());
   INSERT INTO order_lines (order_id, product_id, branch_id, qty, unit_price_paise) SELECT id, 3, 1, 1, 100 FROM orders;`);
  const rows = await ok(`BEGIN;\n${prep('h', Q.NEWEST_HOLDER_SQL)}EXECUTE h(1, 3);\nCOMMIT;`);
  assert.deepEqual(rows, [['00000000-0000-0000-0000-0000000000a2']]); // newest AWAITING_PAYMENT; the PLACED one is never touched
});

test('Rescue 1: equivalents are same category, within +-15% price, in stock at the same branch', { skip: SKIP }, async () => {
  await ok(FIXTURE);
  // product 2 (out of stock, 2599) at branch 1: product 1 (2499, 1 unit) and product 3 (2699, 25) qualify; laptop and mouse do not
  const rows = await ok(`${prep('e', Q.EQUIVALENTS_SQL)}EXECUTE e(2, 1, 259900, 1);`);
  assert.deepEqual(rows.map((r) => r[0]), ['1', '3']);
  // needing 2 units rules product 1 out
  const two = await ok(`${prep('e', Q.EQUIVALENTS_SQL)}EXECUTE e(2, 1, 259900, 2);`);
  assert.deepEqual(two.map((r) => r[0]), ['3']);
  // a 20,00,000 paise laptop must not overflow the 32-bit maths
  const big = await sh(`${prep('e', Q.EQUIVALENTS_SQL)}EXECUTE e(4, 1, 4999900, 1);`);
  assert.equal(big.code, 0, big.err);
});

test('Rescue 2: one branch that can cover the whole cart, shopper city first', { skip: SKIP }, async () => {
  await ok(FIXTURE);
  const run = (products: string, qtys: string, city: string) => ok(`${prep('o', Q.ONE_BRANCH_SQL)}EXECUTE o('${products}', '${qtys}', '${city}');`);
  assert.deepEqual((await run('{1,3}', '{1,1}', 'Bengaluru')).map((r) => r[0]), ['1', '3']); // branch 1 (city match) then 3
  assert.deepEqual((await run('{1,3}', '{1,1}', 'Mumbai')).map((r) => r[0]), ['3', '1']); // city preference flips the order
  assert.deepEqual((await run('{1,3}', '{2,1}', 'Bengaluru')).map((r) => r[0]), ['3']); // branch 1 only has 1 unit of product 1
  assert.deepEqual((await run('{1,2}', '{1,1}', 'Bengaluru')), []); // product 2 is nowhere: honest empty answer
});

test('Rescue 3: stock of the failed products across branches', { skip: SKIP }, async () => {
  await ok(FIXTURE);
  const rows = await ok(`${prep('s', Q.BRANCH_STOCK_SQL)}EXECUTE s('{1,2}');`);
  assert.deepEqual(rows.map((r) => `${r[0]}:${r[2]}`).sort(), ['1:1', '3:1']); // only branches with stock > 0
});

test('search fallback: pg_trgm finds "bluetoth" (typo) and respects filters', { skip: SKIP }, async () => {
  await ok(FIXTURE);
  const hits = (q: string, category: string, min: string, max: string) =>
    ok(`${prep('f', Q.FALLBACK_HITS_SQL)}EXECUTE f('${q}', ${category}, ${min}, ${max}, 20);`);
  const typo = await hits('bluetoth', 'NULL', 'NULL', 'NULL');
  assert.deepEqual(typo.map((r) => r[0]).sort(), ['1', '2', '3']);
  assert.deepEqual((await hits('bluetoth', "'computing'", 'NULL', 'NULL')), []); // category filter
  assert.deepEqual((await hits('bluetoth', 'NULL', '255000', '300000')).map((r) => r[0]).sort(), ['2', '3']); // price filter
  assert.deepEqual((await hits('laptop', 'NULL', 'NULL', 'NULL')).map((r) => r[0]), ['4']); // tag / name match
  assert.equal((await hits('', 'NULL', 'NULL', 'NULL')).length, 5); // empty query = browse everything

  const branches = await ok(`${prep('b', Q.FALLBACK_BRANCHES_SQL)}EXECUTE b('{1}', 'Mumbai');`);
  assert.deepEqual(branches.map((r) => `${r[6]}:${r[9]}`), ['3:4']); // city filter: branch 3, 4 available
});

test('browse: product list with city filter and category count', { skip: SKIP }, async () => {
  await ok(FIXTURE);
  const list = (category: string, city: string) => ok(`${prep('p', Q.PRODUCTS_LIST_SQL)}EXECUTE p(${category}, ${city}, 24, 0);`);
  const all = await list('NULL', 'NULL');
  assert.equal(all.length, 5);
  assert.equal(all.find((r) => r[0] === '1')![8], '5'); // product 1: 1 + 0 + 4
  const blr = await list('NULL', "'Bengaluru'");
  assert.equal(blr.find((r) => r[0] === '1')![8], '1');
  const mum = await list("'audio'", "'Mumbai'");
  assert.equal(mum.length, 3);
  assert.equal(mum.find((r) => r[0] === '2')![8], '0'); // out of stock: 0, never negative
  assert.deepEqual(await ok(`${prep('c', Q.PRODUCTS_COUNT_SQL)}EXECUTE c('audio');`), [['3']]);
});

test('one ledger identity: sale + release keep reserved and on_hand consistent', { skip: SKIP }, async () => {
  await ok(FIXTURE);
  // reserve 1 (hold), then finalize (on_hand -1, reserved -1): available is unchanged by finalizing
  await ok(`${prep('r', Q.RESERVE_SQL)}EXECUTE r(1, 3, 2);`);
  const [before] = await ok('SELECT on_hand - reserved - buffer FROM inventory WHERE branch_id = 1 AND product_id = 3;');
  await ok(`${prep('s', Q.SET_STOCK_SQL)}EXECUTE s(1, 3, 23, 0);`); // finalizer: on_hand 25 -> 23, reserved 2 -> 0
  const [after] = await ok('SELECT on_hand - reserved - buffer FROM inventory WHERE branch_id = 1 AND product_id = 3;');
  assert.deepEqual(before, ['23']);
  assert.deepEqual(after, ['23']); // available did not move: finalizing can never oversell
});
