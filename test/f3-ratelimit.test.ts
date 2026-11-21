import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';
import { closePool, _setPoolForTesting } from '../src/db.ts';
import { resetFailedKeysForTesting } from '../src/routes/common.ts';

loadConfig(['pg', 'api'], {
  DATABASE_URL: 'postgres://localhost/dummy',
  STAFF_KEY: 'test-staff-key-12345',
  ADMIN_TOKEN: 'test-admin-token-12345',
});

test('F3: Rate Limits Verification', async (t) => {
  const app = await buildApp();

  t.after(async () => {
    resetFailedKeysForTesting();
    _setPoolForTesting(undefined);
    await app.close();
    await closePool();
  });

  t.beforeEach(() => {
    resetFailedKeysForTesting();
    _setPoolForTesting({ query: async () => ({ rows: [] }) });
  });

  await t.test('1. Failed staff key attempts: 5 failed attempts gives 429 for 6th attempt', async () => {
    // 5 attempts with wrong staff key -> 401
    for (let i = 1; i <= 5; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/staff/products',
        headers: { 'x-staff-key': 'wrong-key' },
        payload: { name: 'test' },
      });
      assert.equal(res.statusCode, 401, `Attempt ${i} should be 401`);
    }

    // 6th attempt -> 429
    const res6 = await app.inject({
      method: 'POST',
      url: '/staff/products',
      headers: { 'x-staff-key': 'wrong-key' },
      payload: { name: 'test' },
    });
    assert.equal(res6.statusCode, 429);
    const body = JSON.parse(res6.body);
    assert.equal(body.error?.code, 'RATE_LIMITED');
  });

  await t.test('2. Health route is unlimited and normal client is not blocked', async () => {
    for (let i = 0; i < 20; i++) {
      const res = await app.inject({ method: 'GET', url: '/health' });
      assert.notEqual(res.statusCode, 429, 'Health route must not be rate limited');
      assert.ok(res.statusCode === 200 || res.statusCode === 503);
    }
  });

  await t.test('3. Kiosk cart route rate limits above 30 req/min', async () => {
    let got429 = false;
    for (let i = 0; i < 35; i++) {
      const res = await app.inject({
        method: 'GET',
        url: '/kiosk/cart/TESTCODE',
      });
      if (res.statusCode === 429) {
        got429 = true;
        const body = JSON.parse(res.body);
        assert.equal(body.error?.code, 'RATE_LIMITED');
        break;
      }
    }
    assert.ok(got429, 'Expected 429 after exceeding 30 req/min limit on /kiosk/cart/:code');
  });
});
