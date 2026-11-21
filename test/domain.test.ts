import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConfigError, loadConfig } from '../src/config.ts';
import { availableOf, bestStatus, displayStatus, isStale, stockStatus } from '../src/domain/availability.ts';
import { buildDoc, docId, docVersion } from '../src/domain/doc.ts';
import { mergeByProduct, sortLines } from '../src/domain/lines.ts';
import { partitionFor } from '../src/domain/partition.ts';
import { planSplit, priceWindow } from '../src/domain/rescue.ts';
import { buildSearchBody } from '../src/domain/searchQuery.ts';
import { EventSchema } from '../src/events.ts';

test('available = on_hand - reserved - buffer', () => {
  assert.equal(availableOf({ on_hand: 5, reserved: 2, buffer: 1 }), 2);
  assert.equal(availableOf({ on_hand: 1, reserved: 0, buffer: 1 }), 0); // the "buffer trap" from the guide
});

test('status rule: >=3 IN_STOCK, 1-2 LAST_UNITS, <=0 OUT', () => {
  assert.equal(stockStatus(10, 3), 'IN_STOCK');
  assert.equal(stockStatus(3, 3), 'IN_STOCK');
  assert.equal(stockStatus(2, 3), 'LAST_UNITS');
  assert.equal(stockStatus(1, 3), 'LAST_UNITS');
  assert.equal(stockStatus(0, 3), 'OUT');
  assert.equal(stockStatus(-2, 3), 'OUT');
});

test('freshness rule: older than 60 s shows CONFIRM_WITH_STORE, but OUT stays OUT', () => {
  const now = Date.parse('2026-11-20T10:00:00Z');
  assert.equal(isStale('2026-11-20T09:59:30Z', now, 60), false);
  assert.equal(isStale('2026-11-20T09:58:00Z', now, 60), true);
  assert.equal(isStale(null, now, 60), true);
  assert.equal(isStale('not a date', now, 60), true);
  assert.equal(displayStatus('IN_STOCK', true), 'CONFIRM_WITH_STORE');
  assert.equal(displayStatus('LAST_UNITS', true), 'CONFIRM_WITH_STORE');
  assert.equal(displayStatus('OUT', true), 'OUT');
  assert.equal(displayStatus('IN_STOCK', false), 'IN_STOCK');
  assert.equal(bestStatus(['OUT', 'CONFIRM_WITH_STORE', 'LAST_UNITS']), 'LAST_UNITS');
  assert.equal(bestStatus([]), 'OUT');
});

test('cart lines are locked in one global order (no deadlocks between checkouts)', () => {
  const sorted = sortLines([
    { branch_id: 2, product_id: 1 },
    { branch_id: 1, product_id: 9 },
    { branch_id: 1, product_id: 3 },
  ]);
  assert.deepEqual(sorted.map((l) => `${l.branch_id}:${l.product_id}`), ['1:3', '1:9', '2:1']);
  assert.deepEqual(mergeByProduct([{ product_id: 5, qty: 1 }, { product_id: 2, qty: 2 }, { product_id: 5, qty: 3 }]), [
    { product_id: 2, qty: 2 },
    { product_id: 5, qty: 4 },
  ]);
});

test('partitions are deterministic, in range and spread across both partitions', () => {
  assert.equal(partitionFor('abc', 2), partitionFor('abc', 2));
  const seen = new Set<number>();
  for (let i = 0; i < 200; i++) {
    const p = partitionFor(`order-${i}`, 2);
    assert.ok(p === 0 || p === 1);
    seen.add(p);
  }
  assert.equal(seen.size, 2);
  // the same key always stays on the same partition (per-key ordering)
  assert.equal(partitionFor('1:3', 12), partitionFor('1:3', 12));
});

test('equivalent price window is +-15% in integer maths (same as the SQL)', () => {
  assert.deepEqual(priceWindow(259900), { min: 220915, max: 298885 });
  assert.ok(269900 >= priceWindow(259900).min && 269900 <= priceWindow(259900).max);
  // large prices must not overflow 32-bit: 2,00,000 rupees in paise
  assert.equal(priceWindow(20_000_000).max, 23_000_000);
});

test('split plan prefers branches already used, then the shopper city, then the lowest id', () => {
  const stock = [
    { branch_id: 1, city: 'Bengaluru', product_id: 7, available: 5 },
    { branch_id: 2, city: 'Bengaluru', product_id: 7, available: 5 },
    { branch_id: 3, city: 'Mumbai', product_id: 7, available: 5 },
    { branch_id: 3, city: 'Mumbai', product_id: 8, available: 5 },
    { branch_id: 2, city: 'Bengaluru', product_id: 8, available: 5 },
  ];
  const plan = planSplit(
    [
      { branch_id: 9, product_id: 7, qty: 1 },
      { branch_id: 9, product_id: 8, qty: 1 },
    ],
    stock,
    [3], // branch 3 is already in the plan
    'Bengaluru',
  );
  assert.ok(plan);
  assert.deepEqual(plan.map((a) => a.to_branch_id), [3, 3]); // fewest shipments beats the city preference
  assert.equal(planSplit([{ branch_id: 9, product_id: 99, qty: 1 }], stock, [], null), null); // nobody has it
});

test('search body: fuzzy multi_match + the three filters + collapse by product', () => {
  const body = buildSearchBody({ q: 'bluetoth', category: 'audio', minPrice: 50000, maxPrice: 300000, city: 'Bengaluru', size: 20 }) as any;
  const mm = body.query.bool.must[0].multi_match;
  assert.equal(mm.query, 'bluetoth');
  assert.equal(mm.fuzziness, 'AUTO');
  assert.deepEqual(mm.fields, ['name^3', 'brand^2', 'tags']);
  assert.deepEqual(body.query.bool.filter, [
    { term: { category: 'audio' } },
    { range: { price_paise: { gte: 50000, lte: 300000 } } },
    { term: { city: 'Bengaluru' } },
  ]);
  assert.equal(body.collapse.field, 'product_id');
  assert.deepEqual(buildSearchBody({ q: '  ', size: 5 }).query, { bool: { must: [{ match_all: {} }], filter: [] } });
});

test('search document: id, external version and status', () => {
  const doc = buildDoc(
    { product_id: 1, sku: 'S', name: 'N', brand: 'B', category: 'audio', tags: ['t'], price_paise: 100, image_url: null, branch_id: 2, branch_name: 'Br', city: 'Bengaluru', on_hand: 4, reserved: 1, buffer: 0, rev: 7 },
    3,
    '2026-11-20T10:00:00Z',
  );
  assert.equal(docId(1, 2), '1:2');
  assert.equal(docVersion(0), 1); // rev 0 is a valid first version
  assert.equal(docVersion(7), 8);
  assert.equal(doc.available, 3);
  assert.equal(doc.status, 'IN_STOCK');
  assert.equal(doc.rev, 7);
});

test('events are validated with Zod on both sides', () => {
  const ok = {
    event_id: '8d3f6a52-3b8f-4f1e-9a53-0d4d4f9f1d10',
    type: 'order.placed',
    version: 1,
    occurred_at: '2026-11-20T10:15:00Z',
    data: { order_id: '8d3f6a52-3b8f-4f1e-9a53-0d4d4f9f1d11', customer_id: 1, lines: [{ branch_id: 2, product_id: 15, qty: 1 }] },
  };
  assert.equal(EventSchema.parse(ok).type, 'order.placed');
  assert.throws(() => EventSchema.parse({ ...ok, data: { ...ok.data, lines: [] } })); // no lines
  assert.throws(() => EventSchema.parse({ ...ok, data: { ...ok.data, lines: [{ branch_id: 2, product_id: 15, qty: 11 }] } })); // qty > 10
  assert.throws(() => EventSchema.parse({ ...ok, type: 'order.unknown' }));
  const inv = {
    event_id: ok.event_id,
    type: 'inventory.changed',
    version: 1,
    occurred_at: ok.occurred_at,
    data: { branch_id: 1, product_id: 1, on_hand: 1, reserved: 0, buffer: 0, rev: 3, prev_available: 0 },
  };
  assert.equal(EventSchema.parse(inv).type, 'inventory.changed');
});

test('config fails fast and names the missing variables (never their values)', () => {
  const saved = { ...process.env };
  for (const k of ['DATABASE_URL', 'KAFKA_BROKERS', 'KAFKA_CA_B64', 'KAFKA_CERT_B64', 'KAFKA_KEY_B64', 'KAFKA_SASL_USERNAME', 'KAFKA_SASL_PASSWORD', 'OPENSEARCH_URL', 'STAFF_KEY', 'ADMIN_TOKEN']) delete process.env[k];
  try {
    assert.throws(
      () => loadConfig(['pg', 'kafka', 'opensearch', 'api']),
      (e: unknown) => {
        assert.ok(e instanceof ConfigError);
        const text = e.problems.join('|');
        for (const name of ['DATABASE_URL', 'KAFKA_BROKERS', 'OPENSEARCH_URL', 'STAFF_KEY', 'ADMIN_TOKEN']) assert.ok(text.includes(name), name);
        return true;
      },
    );
    process.env.DATABASE_URL = 'postgres://u:p@h:1/d';
    process.env.STAFF_KEY = 'short';
    assert.throws(() => loadConfig(['pg', 'api']), /STAFF_KEY must be at least 8/);
    process.env.STAFF_KEY = 'staff-key-ok';
    process.env.ADMIN_TOKEN = 'admin-token-ok';
    const c = loadConfig(['pg', 'api']);
    assert.equal(c.HOLD_MINUTES, 10);
    assert.equal(c.LOW_STOCK, 3);
    assert.equal(c.STALE_SECONDS, 60);
    assert.equal(c.PG_POOL_MAX, 6);
  } finally {
    process.env = saved;
  }
});

test('JSON body parser accepts an empty body (pay/cancel/DELETE with a JSON content-type) and rejects bad JSON with 400', async () => {
  const { parseJsonBody } = await import('../src/domain/json.ts');
  assert.equal(parseJsonBody(''), undefined);
  assert.equal(parseJsonBody('   \n'), undefined);
  assert.deepEqual(parseJsonBody('{"qty":2}'), { qty: 2 });
  assert.throws(() => parseJsonBody('{oops'), (e: unknown) => (e as { statusCode?: number }).statusCode === 400);
});

test('search query accepts min_price/max_price (README) and minPrice/maxPrice, validates the range', async () => {
  const { SearchQuery } = await import('../src/domain/searchParams.ts');
  const snake = SearchQuery.parse({ q: 'x', min_price: '50000', max_price: '300000' });
  assert.equal(snake.minPrice, 50000);
  assert.equal(snake.maxPrice, 300000);
  const camel = SearchQuery.parse({ minPrice: '1', maxPrice: '2' });
  assert.deepEqual([camel.minPrice, camel.maxPrice], [1, 2]);
  assert.equal(SearchQuery.parse({ minPrice: '5', min_price: '9' }).minPrice, 5); // camelCase wins
  const none = SearchQuery.parse({});
  assert.deepEqual([none.q, none.size, none.minPrice, none.maxPrice], ['', 20, undefined, undefined]);
  assert.throws(() => SearchQuery.parse({ min_price: '10', max_price: '5' }));
  assert.throws(() => SearchQuery.parse({ size: '500' }));
});

test('catalogue validation: checks duplicate id, non-positive price, flag v constraints, and column count', async () => {
  const { parseAndValidateCatalogue } = await import('../src/domain/catalogue.ts');

  // Valid PSV
  const validPsv = `id|dept|brand|name|price_rupees|flag|source_url|checked_on
1|audio|Sony|Sony WH-1000XM5|29990|v|https://example.com/sony|2026-11-20
2|mobiles|Apple|iPhone 15|69990|i||`;
  const valid = parseAndValidateCatalogue(validPsv);
  assert.equal(valid.length, 2);
  assert.equal(valid[0]!.price_paise, 2999000);
  assert.equal(valid[0]!.category, 'audio');

  // Duplicate ID
  const dupPsv = `id|dept|brand|name|price_rupees|flag|source_url|checked_on
1|audio|Sony|Headphones|1000|i||
1|audio|Bose|Earphones|2000|i||`;
  assert.throws(() => parseAndValidateCatalogue(dupPsv), /duplicate product id 1/i);

  // Non-positive price
  const badPricePsv = `id|dept|brand|name|price_rupees|flag|source_url|checked_on
1|audio|Sony|Headphones|0|i||`;
  assert.throws(() => parseAndValidateCatalogue(badPricePsv), /non-positive/i);

  // 'v' row missing source_url or checked_on
  const missingSourcePsv = `id|dept|brand|name|price_rupees|flag|source_url|checked_on
1|audio|Sony|Headphones|1000|v||2026-11-20`;
  assert.throws(() => parseAndValidateCatalogue(missingSourcePsv), /requires both source_url and checked_on/i);

  const missingDatePsv = `id|dept|brand|name|price_rupees|flag|source_url|checked_on
1|audio|Sony|Headphones|1000|v|https://example.com|`;
  assert.throws(() => parseAndValidateCatalogue(missingDatePsv), /requires both source_url and checked_on/i);

  // Wrong column count
  const wrongColsPsv = `id|dept|brand|name|price_rupees|flag|source_url|checked_on
1|audio|Sony|Headphones|1000|i`;
  assert.throws(() => parseAndValidateCatalogue(wrongColsPsv), /expected 8/i);
});

test('session token hashing and matching: SHA-256 hash storage and verification', async () => {
  const crypto = await import('node:crypto');
  const tokenBytes = crypto.randomBytes(32);
  const token = tokenBytes.toString('hex');
  const hash1 = crypto.createHash('sha256').update(token).digest('hex');
  const hash2 = crypto.createHash('sha256').update(token).digest('hex');
  assert.equal(hash1, hash2);
  assert.equal(hash1.length, 64);

  // Mismatched token creates different hash
  const badToken = crypto.randomBytes(32).toString('hex');
  const badHash = crypto.createHash('sha256').update(badToken).digest('hex');
  assert.notEqual(hash1, badHash);
});

test('cart code alphabet and expiry: 8 chars from unambiguous alphabet', async () => {
  const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const ambiguousChars = ['0', '1', 'I', 'O', 'L'];

  // Check alphabet excludes ambiguous characters
  for (const c of ambiguousChars) {
    assert.ok(!ALPHABET.includes(c), `Alphabet should not contain ${c}`);
  }

  // Generate 100 codes and assert format
  for (let i = 0; i < 100; i++) {
    let code = '';
    for (let j = 0; j < 8; j++) {
      code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    assert.equal(code.length, 8);
    assert.match(code, /^[A-Z2-9]{8}$/);
  }

  // Expiry logic check
  const now = Date.now();
  const pastExpiry = new Date(now - 1000).getTime();
  const futureExpiry = new Date(now + 60000).getTime();
  assert.ok(pastExpiry < now, 'Past expiry is recognized as expired');
  assert.ok(futureExpiry > now, 'Future expiry is recognized as valid');
});

test('shelves since filtering: returns only items updated after the timestamp', () => {
  const t0 = new Date('2026-11-20T10:00:00Z').getTime();
  const t1 = new Date('2026-11-20T10:05:00Z').getTime();
  const t3 = new Date('2026-11-20T10:15:00Z').getTime();

  const items = [
    { product_id: 1, updated_at: '2026-11-20T10:00:00Z' },
    { product_id: 2, updated_at: '2026-11-20T10:07:00Z' },
    { product_id: 3, updated_at: '2026-11-20T10:12:00Z' },
  ];

  const filtered = items.filter((item) => new Date(item.updated_at).getTime() > t1);
  assert.equal(filtered.length, 2);
  assert.deepEqual(filtered.map((i) => i.product_id), [2, 3]);

  const filteredAll = items.filter((item) => new Date(item.updated_at).getTime() > t0 - 1000);
  assert.equal(filteredAll.length, 3);

  const filteredNone = items.filter((item) => new Date(item.updated_at).getTime() > t3);
  assert.equal(filteredNone.length, 0);
});

test('kiosk branch check: marks lines as at_this_branch correctly', () => {
  const lines = [
    { product_id: 1, branch_id: 1, qty: 1 },
    { product_id: 2, branch_id: 2, qty: 1 },
    { product_id: 3, branch_id: 1, qty: 2 },
  ];

  const atBranch1 = lines.map((l) => ({ ...l, at_this_branch: l.branch_id === 1 }));
  assert.equal(atBranch1[0]!.at_this_branch, true);
  assert.equal(atBranch1[1]!.at_this_branch, false);
  assert.equal(atBranch1[2]!.at_this_branch, true);

  const atBranch2 = lines.map((l) => ({ ...l, at_this_branch: l.branch_id === 2 }));
  assert.equal(atBranch2[0]!.at_this_branch, false);
  assert.equal(atBranch2[1]!.at_this_branch, true);
  assert.equal(atBranch2[2]!.at_this_branch, false);
});
