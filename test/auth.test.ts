import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { buildApp } from '../src/app.ts';
import { loadConfigOrExit } from '../src/config.ts';
import { closePool, getPool } from '../src/db.ts';
import { createSession } from '../src/services/session.ts';

loadConfigOrExit(['pg', 'api']);

describe('Auth & Session Security (customerOf)', () => {
  let app: any;
  let validSession: { customer_id: number; token: string; name: string | null };

  before(async () => {
    app = await buildApp();
    validSession = await createSession('Auth Test Shopper');
  });

  after(async () => {
    await app.close();
    await closePool();
  });

  it('1. No token: rejects with 401 SESSION_REQUIRED when no session token provided and not in demo mode', async () => {
    process.env.DEMO_MODE = 'false';
    const res = await app.inject({
      method: 'GET',
      url: '/cart',
    });
    assert.equal(res.statusCode, 401);
    const body = JSON.parse(res.body);
    assert.equal(body.error?.code, 'SESSION_REQUIRED');
  });

  it('2. Bad token: rejects with 401 BAD_SESSION on nonexistent or invalid session token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/cart',
      headers: {
        'x-session-token': 'deadbeef00112233445566778899aabbccddeeff00112233445566778899aabb',
      },
    });
    assert.equal(res.statusCode, 401);
    const body = JSON.parse(res.body);
    assert.equal(body.error?.code, 'BAD_SESSION');
  });

  it('3. Spoofed header: rejects with 401 BAD_SESSION when X-Customer-Id does not match the token owner', async () => {
    const spoofedCustomerId = validSession.customer_id + 999;
    const res = await app.inject({
      method: 'GET',
      url: '/cart',
      headers: {
        'x-session-token': validSession.token,
        'x-customer-id': String(spoofedCustomerId),
      },
    });
    assert.equal(res.statusCode, 401);
    const body = JSON.parse(res.body);
    assert.equal(body.error?.code, 'BAD_SESSION');
    assert.match(body.error?.message, /does not match X-Customer-Id/);
  });

  it('4. Valid token: succeeds with 200 when valid token matches X-Customer-Id or standalone', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/cart',
      headers: {
        'x-session-token': validSession.token,
        'x-customer-id': String(validSession.customer_id),
      },
    });
    assert.equal(res.statusCode, 200);
  });

  it('5. Demo mode: allows demo customers 1..20 when DEMO_MODE=true', async () => {
    process.env.DEMO_MODE = 'true';

    // Demo customer 7
    const res7 = await app.inject({
      method: 'GET',
      url: '/cart',
      headers: { 'x-customer-id': '7' },
    });
    assert.equal(res7.statusCode, 200);

    // Demo customer 20
    const res20 = await app.inject({
      method: 'GET',
      url: '/cart',
      headers: { 'x-customer-id': '20' },
    });
    assert.equal(res20.statusCode, 200);

    // Customer 21 (above DEMO_CUSTOMER_MAX) -> 401
    const res21 = await app.inject({
      method: 'GET',
      url: '/cart',
      headers: { 'x-customer-id': '21' },
    });
    assert.equal(res21.statusCode, 401);
    assert.equal(JSON.parse(res21.body).error?.code, 'SESSION_REQUIRED');

    // Missing header even in DEMO_MODE -> 401
    const resNoHeader = await app.inject({
      method: 'GET',
      url: '/cart',
    });
    assert.equal(resNoHeader.statusCode, 401);
  });

  it('6. Non-demo mode: rejects demo customer without token when DEMO_MODE=false', async () => {
    process.env.DEMO_MODE = 'false';

    const res7 = await app.inject({
      method: 'GET',
      url: '/cart',
      headers: { 'x-customer-id': '7' },
    });
    assert.equal(res7.statusCode, 401);
    assert.equal(JSON.parse(res7.body).error?.code, 'SESSION_REQUIRED');
  });
});
