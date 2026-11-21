import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { loadConfig, cfg } from '../src/config.ts';
import { _setPoolForTesting } from '../src/db.ts';
import {
  _setGoogleJwksForTesting,
  buildGoogleAuthUrl,
  handleGoogleCallback,
  exchangeLoginCode,
  GOOGLE_AUTH_ENDPOINT,
} from '../src/services/googleAuth.ts';
import { AppError } from '../src/errors.ts';

test('Google OAuth Sign-In (Redirect PKCE Flow)', async (t) => {
  // 1. Setup in-memory mock DB
  type MockCustomer = { id: number; name: string; email: string; google_sub?: string; auth_provider?: string; email_verified?: boolean };
  type MockState = { id: number; state_hash: string; code_verifier: string; nonce: string; expires_at: Date; used_at: Date | null };
  type MockCode = { id: number; code_hash: string; customer_id: number; expires_at: Date; used_at: Date | null };
  type MockSession = { token_hash: string; customer_id: number; expires_at: Date };

  const db = {
    customers: [] as MockCustomer[],
    oauthStates: [] as MockState[],
    loginCodes: [] as MockCode[],
    sessions: [] as MockSession[],
    carts: [] as { id: number; customer_id: number }[],
    cartItems: [] as { cart_id: number; product_id: number; branch_id: number; qty: number }[],
    inventory: [] as { product_id: number; branch_id: number; on_hand: number; reserved: number; buffer: number }[],
    nextCustId: 100,
    nextStateId: 1,
    nextCodeId: 1,
  };

  const mockPool = {
    query: async (sql: string, params: any[] = []) => {
      const s = sql.trim();

      // INSERT INTO oauth_states
      if (s.includes('INSERT INTO oauth_states')) {
        const row: MockState = {
          id: db.nextStateId++,
          state_hash: params[0],
          code_verifier: params[1],
          nonce: params[2],
          expires_at: new Date(Date.now() + 10 * 60 * 1000),
          used_at: null,
        };
        db.oauthStates.push(row);
        return { rows: [row], rowCount: 1 };
      }

      // SELECT FROM oauth_states
      if (s.includes('FROM oauth_states WHERE state_hash =')) {
        const found = db.oauthStates.find((r) => r.state_hash === params[0]);
        return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
      }

      // UPDATE oauth_states SET used_at
      if (s.includes('UPDATE oauth_states SET used_at = now()')) {
        const row = db.oauthStates.find((r) => r.id === params[0]);
        if (row) row.used_at = new Date();
        return { rows: [], rowCount: row ? 1 : 0 };
      }

      // SELECT FROM customers WHERE google_sub =
      if (s.includes('FROM customers WHERE google_sub =')) {
        const found = db.customers.find((c) => c.google_sub === params[0]);
        return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
      }

      // SELECT FROM customers WHERE lower(email) =
      if (s.includes('FROM customers WHERE lower(email) =')) {
        const found = db.customers.find((c) => c.email.toLowerCase() === String(params[0]).toLowerCase());
        return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
      }

      // UPDATE customers SET google_sub
      if (s.includes('UPDATE customers SET google_sub =')) {
        const cust = db.customers.find((c) => c.id === params[1]);
        if (cust) {
          cust.google_sub = params[0];
          cust.email_verified = true;
          cust.auth_provider = cust.auth_provider || 'google';
        }
        return { rows: [], rowCount: cust ? 1 : 0 };
      }

      // INSERT INTO customers
      if (s.includes('INSERT INTO customers')) {
        const newCust: MockCustomer = {
          id: db.nextCustId++,
          name: params[0],
          email: params[1],
          google_sub: params[2],
          auth_provider: 'google',
          email_verified: true,
        };
        db.customers.push(newCust);
        return { rows: [newCust], rowCount: 1 };
      }

      // INSERT INTO oauth_login_codes
      if (s.includes('INSERT INTO oauth_login_codes')) {
        const row: MockCode = {
          id: db.nextCodeId++,
          code_hash: params[0],
          customer_id: params[1],
          expires_at: new Date(Date.now() + 60 * 1000),
          used_at: null,
        };
        db.loginCodes.push(row);
        return { rows: [row], rowCount: 1 };
      }

      // SELECT FROM oauth_login_codes
      if (s.includes('FROM oauth_login_codes WHERE code_hash =')) {
        const found = db.loginCodes.find((r) => r.code_hash === params[0]);
        return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
      }

      // UPDATE oauth_login_codes SET used_at
      if (s.includes('UPDATE oauth_login_codes SET used_at = now()')) {
        const row = db.loginCodes.find((r) => r.id === params[0]);
        if (row) row.used_at = new Date();
        return { rows: [], rowCount: row ? 1 : 0 };
      }

      // SELECT FROM customers WHERE id =
      if (s.includes('FROM customers WHERE id =')) {
        const found = db.customers.find((c) => c.id === params[0]);
        return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
      }

      // SELECT FROM sessions WHERE token_hash =
      if (s.includes('FROM sessions WHERE token_hash =')) {
        const found = db.sessions.find((s) => s.token_hash === params[0] && s.expires_at > new Date());
        return { rows: found ? [{ customer_id: found.customer_id }] : [], rowCount: found ? 1 : 0 };
      }

      // INSERT INTO sessions
      if (s.includes('INSERT INTO sessions')) {
        const session: MockSession = {
          token_hash: params[0],
          customer_id: params[1],
          expires_at: new Date(Date.now() + 30 * 86400 * 1000),
        };
        db.sessions.push(session);
        return { rows: [], rowCount: 1 };
      }

      // Cart merge queries
      if (s.includes('FROM cart_items ci') && s.includes('JOIN carts c')) {
        const cart = db.carts.find((c) => c.customer_id === params[0]);
        if (!cart) return { rows: [], rowCount: 0 };
        const items = db.cartItems.filter((i) => i.cart_id === cart.id);
        return { rows: items, rowCount: items.length };
      }

      if (s.includes('FROM carts WHERE customer_id =')) {
        const found = db.carts.find((c) => c.customer_id === params[0]);
        return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
      }

      if (s.includes('INSERT INTO carts')) {
        let cart = db.carts.find((c) => c.customer_id === params[0]);
        if (!cart) {
          cart = { id: db.carts.length + 1, customer_id: params[0] };
          db.carts.push(cart);
        }
        return { rows: [cart], rowCount: 1 };
      }

      if (s.includes('FROM inventory WHERE product_id =')) {
        const inv = db.inventory.find((i) => i.product_id === params[0] && i.branch_id === params[1]);
        const avail = inv ? Math.max(inv.on_hand - inv.reserved - inv.buffer, 0) : 50;
        return { rows: [{ avail }], rowCount: 1 };
      }

      if (s.includes('FROM cart_items WHERE cart_id =')) {
        const item = db.cartItems.find((i) => i.cart_id === params[0] && i.product_id === params[1] && i.branch_id === params[2]);
        return { rows: item ? [item] : [], rowCount: item ? 1 : 0 };
      }

      if (s.includes('INSERT INTO cart_items')) {
        const existing = db.cartItems.find((i) => i.cart_id === params[0] && i.product_id === params[1] && i.branch_id === params[2]);
        if (existing) {
          existing.qty = params[3];
        } else {
          db.cartItems.push({ cart_id: params[0], product_id: params[1], branch_id: params[2], qty: params[3] });
        }
        return { rows: [], rowCount: 1 };
      }

      if (s.includes('FROM orders WHERE customer_id =')) {
        return { rows: [{ count: '0' }], rowCount: 1 };
      }

      if (s.includes('DELETE FROM')) {
        return { rows: [], rowCount: 1 };
      }

      return { rows: [], rowCount: 0 };
    },
  };

  _setPoolForTesting(mockPool);

  // 2. Setup Configuration
  loadConfig(['api'], {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || 'test-client-id-12345.apps.googleusercontent.com',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || 'test-google-client-secret-xyz',
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
    CORS_ORIGINS: 'http://localhost:5173,http://127.0.0.1:5173',
    STAFF_KEY: 'test-staff-key-12345',
    ADMIN_TOKEN: 'test-admin-token-12345',
  });

  const CLIENT_ID = cfg().GOOGLE_CLIENT_ID;
  const CALLBACK_URL = cfg().GOOGLE_CALLBACK_URL;
  const FRONTEND_URL = cfg().FRONTEND_URL.replace(/\/$/, '');

  // 3. Generate Local RSA Key Pair for Mock Google Token Verification
  const keyPair = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = keyPair.publicKey.export({ format: 'jwk' });
  jwk.kid = 'mock-google-key-id-1';

  _setGoogleJwksForTesting({ keys: [jwk] });

  function createMockIdToken(claims: Record<string, any>, kid = 'mock-google-key-id-1'): string {
    const header = { alg: 'RS256', kid };
    const hB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const pB64 = Buffer.from(JSON.stringify(claims)).toString('base64url');
    const sig = crypto.createSign('RSA-SHA256').update(`${hB64}.${pB64}`).sign(keyPair.privateKey, 'base64url');
    return `${hB64}.${pB64}.${sig}`;
  }

  // 4. Mock Global Fetch for Google Token Endpoint
  const originalFetch = globalThis.fetch;
  let mockTokenResponse: { id_token?: string } = {};

  globalThis.fetch = async (url: any, init?: any) => {
    const urlStr = String(url);
    if (urlStr.includes('oauth2.googleapis.com/token')) {
      return {
        ok: true,
        status: 200,
        json: async () => mockTokenResponse,
      } as any;
    }
    return originalFetch(url, init);
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    _setGoogleJwksForTesting(null);
    _setPoolForTesting(undefined);
  });

  await t.test('1. GET /auth/google generates valid PKCE state and Google auth URL', async () => {
    const authUrlStr = await buildGoogleAuthUrl();
    const parsed = new URL(authUrlStr);

    assert.equal(parsed.origin + parsed.pathname, GOOGLE_AUTH_ENDPOINT);
    assert.equal(parsed.searchParams.get('client_id'), CLIENT_ID);
    assert.equal(parsed.searchParams.get('redirect_uri'), CALLBACK_URL);
    assert.equal(parsed.searchParams.get('response_type'), 'code');
    assert.equal(parsed.searchParams.get('scope'), 'openid email profile');
    assert.equal(parsed.searchParams.get('code_challenge_method'), 'S256');
    assert.equal(parsed.searchParams.get('prompt'), 'select_account');

    const state = parsed.searchParams.get('state');
    assert.ok(state, 'state must be present in authorization URL');
    const stateHash = crypto.createHash('sha256').update(state).digest('hex');

    const stateInDb = db.oauthStates.find((s) => s.state_hash === stateHash);
    assert.ok(stateInDb, 'State must be stored in database');
    assert.ok(stateInDb.code_verifier, 'code_verifier must be stored');
    assert.ok(stateInDb.nonce, 'nonce must be stored');
    assert.equal(stateInDb.used_at, null, 'state must initially be unused');
  });

  await t.test('2. Happy path: callback exchanges code, creates user, returns 60s login code', async () => {
    const authUrlStr = await buildGoogleAuthUrl();
    const authUrl = new URL(authUrlStr);
    const state = authUrl.searchParams.get('state')!;
    const nonce = authUrl.searchParams.get('nonce')!;

    const idToken = createMockIdToken({
      iss: 'https://accounts.google.com',
      aud: CLIENT_ID,
      sub: 'google-sub-happy-1',
      email: 'newuser@example.com',
      email_verified: true,
      name: 'Happy User',
      nonce,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    mockTokenResponse = { id_token: idToken };

    const callbackRes = await handleGoogleCallback({ code: 'auth-code-123', state });
    assert.ok(callbackRes.redirectUrl.startsWith(`${FRONTEND_URL}/auth/callback?code=`));

    // Ensure session token did not leak in URL
    assert.equal(callbackRes.redirectUrl.includes('token='), false, 'Session token must not be in URL');

    const code = new URL(callbackRes.redirectUrl).searchParams.get('code')!;
    assert.ok(code, 'One-time code must be in callback URL');

    // Exchange login code for session
    const exchangeRes = await exchangeLoginCode(code);
    assert.ok(exchangeRes.customer_id, 'Must return customer_id');
    assert.ok(exchangeRes.token, 'Must return session token');
    assert.equal(exchangeRes.email, 'newuser@example.com');
    assert.equal(exchangeRes.name, 'Happy User');

    // Verify session stored hashed in DB
    const tokenHash = crypto.createHash('sha256').update(exchangeRes.token).digest('hex');
    assert.ok(db.sessions.some((s) => s.token_hash === tokenHash));
  });

  await t.test('3. State replay: reusing the same state is rejected with 400', async () => {
    const authUrlStr = await buildGoogleAuthUrl();
    const state = new URL(authUrlStr).searchParams.get('state')!;
    const nonce = new URL(authUrlStr).searchParams.get('nonce')!;

    mockTokenResponse = {
      id_token: createMockIdToken({
        iss: 'accounts.google.com',
        aud: CLIENT_ID,
        sub: 'google-sub-replay-1',
        email: 'replay@example.com',
        email_verified: true,
        nonce,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    };

    // First use succeeds
    await handleGoogleCallback({ code: 'code-1', state });

    // Second use with the same state must reject with 400
    await assert.rejects(
      async () => handleGoogleCallback({ code: 'code-2', state }),
      (err: AppError) => {
        assert.equal(err.status, 400);
        return true;
      },
    );
  });

  await t.test('4. Wrong / unknown / missing state is rejected with 400', async () => {
    await assert.rejects(
      async () => handleGoogleCallback({ code: 'code-xyz' }),
      (err: AppError) => {
        assert.equal(err.status, 400);
        return true;
      },
    );

    await assert.rejects(
      async () => handleGoogleCallback({ code: 'code-xyz', state: 'unknown-nonexistent-state' }),
      (err: AppError) => {
        assert.equal(err.status, 400);
        return true;
      },
    );
  });

  await t.test('5. Wrong nonce is rejected', async () => {
    const authUrlStr = await buildGoogleAuthUrl();
    const state = new URL(authUrlStr).searchParams.get('state')!;

    mockTokenResponse = {
      id_token: createMockIdToken({
        iss: 'https://accounts.google.com',
        aud: CLIENT_ID,
        sub: 'google-sub-bad-nonce',
        email: 'badnonce@example.com',
        email_verified: true,
        nonce: 'totally-wrong-nonce',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    };

    const res = await handleGoogleCallback({ code: 'code-bad-nonce', state });
    assert.equal(res.redirectUrl, `${FRONTEND_URL}/login?error=google_failed`);
  });

  await t.test('6. Wrong audience is rejected', async () => {
    const authUrlStr = await buildGoogleAuthUrl();
    const state = new URL(authUrlStr).searchParams.get('state')!;
    const nonce = new URL(authUrlStr).searchParams.get('nonce')!;

    mockTokenResponse = {
      id_token: createMockIdToken({
        iss: 'https://accounts.google.com',
        aud: 'malicious-other-client-id.apps.googleusercontent.com',
        sub: 'google-sub-bad-aud',
        email: 'badaud@example.com',
        email_verified: true,
        nonce,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    };

    const res = await handleGoogleCallback({ code: 'code-bad-aud', state });
    assert.equal(res.redirectUrl, `${FRONTEND_URL}/login?error=google_failed`);
  });

  await t.test('7. email_verified=false is rejected', async () => {
    const authUrlStr = await buildGoogleAuthUrl();
    const state = new URL(authUrlStr).searchParams.get('state')!;
    const nonce = new URL(authUrlStr).searchParams.get('nonce')!;

    mockTokenResponse = {
      id_token: createMockIdToken({
        iss: 'https://accounts.google.com',
        aud: CLIENT_ID,
        sub: 'google-sub-unverified',
        email: 'unverified@example.com',
        email_verified: false,
        nonce,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    };

    const res = await handleGoogleCallback({ code: 'code-unverified', state });
    assert.equal(res.redirectUrl, `${FRONTEND_URL}/login?error=google_failed`);
  });

  await t.test('8. Link-by-email: links existing user account with matching verified email', async () => {
    const existingCust: MockCustomer = {
      id: 55,
      name: 'Existing Member',
      email: 'member@example.com',
    };
    db.customers.push(existingCust);

    const authUrlStr = await buildGoogleAuthUrl();
    const state = new URL(authUrlStr).searchParams.get('state')!;
    const nonce = new URL(authUrlStr).searchParams.get('nonce')!;

    mockTokenResponse = {
      id_token: createMockIdToken({
        iss: 'https://accounts.google.com',
        aud: CLIENT_ID,
        sub: 'google-sub-link-member-55',
        email: 'member@example.com',
        email_verified: true,
        name: 'Member Name From Google',
        nonce,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    };

    const res = await handleGoogleCallback({ code: 'code-link', state });
    assert.ok(res.redirectUrl.includes('/auth/callback?code='));

    const code = new URL(res.redirectUrl).searchParams.get('code')!;
    const exchange = await exchangeLoginCode(code);

    assert.equal(exchange.customer_id, 55, 'Must link to existing customer ID 55');
    assert.equal(existingCust.google_sub, 'google-sub-link-member-55', 'google_sub must be updated');
    assert.equal(existingCust.email_verified, true);
  });

  await t.test('9. Expired or reused login code is rejected with 401 BAD_LOGIN_CODE', async () => {
    // Ensure customer with id 100 exists
    db.customers.push({ id: 100, name: 'Code User', email: 'codeuser@example.com' });

    // Create code
    const rawCode = crypto.randomBytes(32).toString('hex');
    const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');

    db.loginCodes.push({
      id: db.nextCodeId++,
      code_hash: codeHash,
      customer_id: 100,
      expires_at: new Date(Date.now() + 60 * 1000),
      used_at: null,
    });

    // 1st exchange succeeds
    const res = await exchangeLoginCode(rawCode);
    assert.equal(res.customer_id, 100);

    // 2nd exchange (reused) fails with 401 BAD_LOGIN_CODE
    await assert.rejects(
      async () => exchangeLoginCode(rawCode),
      (err: AppError) => {
        assert.equal(err.status, 401);
        assert.equal(err.code, 'BAD_LOGIN_CODE');
        return true;
      },
    );

    // Expired code fails with 401 BAD_LOGIN_CODE
    const expiredRawCode = 'expired-code-12345';
    const expiredHash = crypto.createHash('sha256').update(expiredRawCode).digest('hex');
    db.loginCodes.push({
      id: db.nextCodeId++,
      code_hash: expiredHash,
      customer_id: 100,
      expires_at: new Date(Date.now() - 10_000), // in the past
      used_at: null,
    });

    await assert.rejects(
      async () => exchangeLoginCode(expiredRawCode),
      (err: AppError) => {
        assert.equal(err.status, 401);
        assert.equal(err.code, 'BAD_LOGIN_CODE');
        return true;
      },
    );
  });

  await t.test('10. Guest cart merge on exchange with bearer guest token', async () => {
    const guestToken = 'guest-session-token-999';
    const guestTokenHash = crypto.createHash('sha256').update(guestToken).digest('hex');
    db.sessions.push({
      token_hash: guestTokenHash,
      customer_id: 900,
      expires_at: new Date(Date.now() + 86400 * 1000),
    });
    db.carts.push({ id: 90, customer_id: 900 });
    db.cartItems.push({ cart_id: 90, product_id: 10, branch_id: 1, qty: 3 });

    db.customers.push({ id: 200, name: 'Google User', email: 'user200@example.com' });

    const code = crypto.randomBytes(32).toString('hex');
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    db.loginCodes.push({
      id: db.nextCodeId++,
      code_hash: codeHash,
      customer_id: 200,
      expires_at: new Date(Date.now() + 60 * 1000),
      used_at: null,
    });

    const exchange = await exchangeLoginCode(code, guestToken);
    assert.equal(exchange.customer_id, 200);

    const userCart = db.carts.find((c) => c.customer_id === 200);
    assert.ok(userCart, 'User cart must be created');
    const userItem = db.cartItems.find((i) => i.cart_id === userCart.id && i.product_id === 10);
    assert.ok(userItem, 'Guest items must be merged into user cart');
    assert.equal(userItem.qty, 3);
  });

  await t.test('11. Open redirect prevention: only redirects to FRONTEND_URL, denies arbitrary URLs', async () => {
    const authUrlStr = await buildGoogleAuthUrl();
    const state = new URL(authUrlStr).searchParams.get('state')!;

    const errorRes = await handleGoogleCallback({ error: 'access_denied', state });
    assert.equal(errorRes.redirectUrl, `${FRONTEND_URL}/login?error=google_denied`);
    assert.ok(errorRes.redirectUrl.startsWith(FRONTEND_URL));

    // Startup failure if FRONTEND_URL is not in CORS_ORIGINS
    const prevFrontend = process.env.FRONTEND_URL;
    try {
      process.env.FRONTEND_URL = 'https://attacker-domain.evil.com';
      assert.throws(
        () => loadConfig(['api']),
        (err: any) => {
          assert.ok(err.message.includes('FRONTEND_URL must be one of CORS_ORIGINS'));
          return true;
        },
      );
    } finally {
      process.env.FRONTEND_URL = prevFrontend;
      loadConfig(['api']);
    }
  });

  await t.test('12. No secret, token, or code leaked in error responses or logs', async () => {
    const authUrlStr = await buildGoogleAuthUrl();
    assert.equal(authUrlStr.includes(cfg().GOOGLE_CLIENT_SECRET), false, 'Client secret must never be in auth URL');

    const state = new URL(authUrlStr).searchParams.get('state')!;
    mockTokenResponse = { id_token: 'not-a-valid-jwt' };

    const failedCallback = await handleGoogleCallback({ code: 'dummy-code', state });
    assert.equal(failedCallback.redirectUrl, `${FRONTEND_URL}/login?error=google_failed`);
    assert.equal(failedCallback.redirectUrl.includes('code='), false);
    assert.equal(failedCallback.redirectUrl.includes('token='), false);
    assert.equal(failedCallback.redirectUrl.includes(cfg().GOOGLE_CLIENT_SECRET), false);
  });
});
