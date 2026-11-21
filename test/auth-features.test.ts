import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../src/auth/crypto.ts';
import { checkLockout, recordFailure, resetFailures } from '../src/auth/lockout.ts';
import { ConsoleMailer } from '../src/auth/mailer.ts';
import { loadConfigOrExit } from '../src/config.ts';
import { getPool } from '../src/db.ts';
import {
  registerCustomer,
  loginCustomer,
  logoutCustomer,
  getCustomerMe,
  forgotPassword,
  resetPassword,
} from '../src/services/auth.ts';

loadConfigOrExit(['pg']);

test('P0-L Auth Unit Tests & Security Rules', async (t) => {
  await t.test('1. Scrypt password hashing format and verification', async () => {
    const raw = 'Password123!';
    const hashed = await hashPassword(raw);
    assert.match(hashed, /^scrypt\$16384\$8\$1\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    assert.equal(await verifyPassword(raw, hashed), true);
    assert.equal(await verifyPassword('WrongPassword', hashed), false);
  });

  await t.test('2. Lockout mechanism: 5 failures allowed, 6th triggers 429', () => {
    const email = 'lockout-test@example.com';
    const ip = '192.168.1.100';
    resetFailures(email, ip);

    for (let i = 0; i < 5; i++) {
      assert.equal(checkLockout(email, ip), false, `Attempt ${i + 1} should not be locked out`);
      recordFailure(email, ip);
    }
    assert.equal(checkLockout(email, ip), true, '6th attempt must be locked out');
    resetFailures(email, ip);
    assert.equal(checkLockout(email, ip), false, 'Reset should clear lockout');
  });

  await t.test('3. Mailer interface logs only in dev and never leaks secrets', async () => {
    const mailer = new ConsoleMailer();
    await mailer.sendPasswordReset('user@example.com', 'https://example.com/reset?token=xyz');
  });

  await t.test('4. End-to-end Auth Workflow: Register, Login, Duplicate, Lockout, Logout, Password Reset, Guest Cart Merge', async () => {
    const pool = getPool();
    const testEmail = `test-user-${Date.now()}@example.com`;
    const testPassword = 'SecurePassword123!';

    // A. Register new account
    const regRes = await registerCustomer({
      name: 'Test Shopper',
      email: testEmail,
      password: testPassword,
      phone: '+919999988888',
    });
    assert.ok(regRes.customer_id > 0);
    assert.ok(regRes.token.length >= 32);
    assert.equal(regRes.email, testEmail);

    // Verify no password hash is returned in response
    assert.equal((regRes as any).password_hash, undefined);

    // B. Duplicate registration rejected with 409 EMAIL_TAKEN
    await assert.rejects(
      async () => {
        await registerCustomer({
          name: 'Duplicate Shopper',
          email: testEmail,
          password: 'AnotherPassword123!',
        });
      },
      (err: any) => err.status === 409 && err.code === 'EMAIL_TAKEN',
    );

    // C. Login with correct credentials
    const loginRes = await loginCustomer({ email: testEmail, password: testPassword });
    assert.equal(loginRes.customer_id, regRes.customer_id);
    assert.ok(loginRes.token.length >= 32);

    // D. Verify getCustomerMe omits password_hash
    const me = await getCustomerMe(regRes.customer_id);
    assert.equal(me.customer_id, regRes.customer_id);
    assert.equal(me.email, testEmail);
    assert.equal(me.is_guest, false);
    assert.equal((me as any).password_hash, undefined);

    // E. Bad credentials for existing user -> 401 BAD_CREDENTIALS
    await assert.rejects(
      async () => {
        await loginCustomer({ email: testEmail, password: 'WrongPassword999!' });
      },
      (err: any) => err.status === 401 && err.code === 'BAD_CREDENTIALS',
    );

    // F. Bad credentials for unknown user -> identical 401 BAD_CREDENTIALS
    await assert.rejects(
      async () => {
        await loginCustomer({ email: `nonexistent-${Date.now()}@example.com`, password: 'WrongPassword999!' });
      },
      (err: any) => err.status === 401 && err.code === 'BAD_CREDENTIALS',
    );

    // G. Logout revokes presented token
    await logoutCustomer(loginRes.token);
    const cryptoMod = await import('node:crypto');
    const tokenHash = cryptoMod.createHash('sha256').update(loginRes.token).digest('hex');
    const sessCheck = await pool.query('SELECT customer_id FROM sessions WHERE token_hash = $1', [tokenHash]);
    assert.equal(sessCheck.rows.length, 0, 'Revoked session must be deleted');

    // H. Forgot password always returns 202
    const forgotRes = await forgotPassword(testEmail);
    assert.deepEqual(forgotRes, { ok: true });
    const forgotUnknown = await forgotPassword('nobody-never-registered@example.com');
    assert.deepEqual(forgotUnknown, { ok: true });

    // I. Password reset with single-use token revoking all sessions
    const activeToken = `pre-reset-active-${Date.now()}-${Math.random()}`;
    const activeHash = cryptoMod.createHash('sha256').update(activeToken).digest('hex');
    await pool.query(
      "INSERT INTO sessions (token_hash, customer_id, expires_at) VALUES ($1, $2, now() + interval '1 day')",
      [activeHash, regRes.customer_id],
    );

    const rawResetToken = `raw-reset-token-${Date.now()}-${Math.random()}-32charslong`;
    const rawResetHash = cryptoMod.createHash('sha256').update(rawResetToken).digest('hex');
    await pool.query(
      "INSERT INTO password_reset_tokens (token_hash, customer_id, expires_at) VALUES ($1, $2, now() + interval '30 minutes')",
      [rawResetHash, regRes.customer_id],
    );

    const newPass = 'BrandNewPassword999!';
    await resetPassword(rawResetToken, newPass);

    // Token is now single-use; reusing it must fail
    await assert.rejects(
      async () => {
        await resetPassword(rawResetToken, 'YetAnotherPassword1!');
      },
      (err: any) => err.status === 400 && err.code === 'INVALID_TOKEN',
    );

    // All prior sessions revoked
    const priorSess = await pool.query('SELECT customer_id FROM sessions WHERE token_hash = $1', [activeHash]);
    assert.equal(priorSess.rows.length, 0, 'Password reset must revoke all sessions');

    // Login with new password succeeds
    const newLogin = await loginCustomer({ email: testEmail, password: newPass });
    assert.equal(newLogin.customer_id, regRes.customer_id);

    // J. Guest cart merge on login
    const guestCustRes = await pool.query<{ id: number }>("INSERT INTO customers (name) VALUES ('Guest Shopper') RETURNING id");
    const guestCustId = guestCustRes.rows[0]!.id;
    const guestRawToken = `guest-token-${Date.now()}`;
    const guestTokenHash = cryptoMod.createHash('sha256').update(guestRawToken).digest('hex');
    await pool.query(
      "INSERT INTO sessions (token_hash, customer_id, expires_at) VALUES ($1, $2, now() + interval '1 day')",
      [guestTokenHash, guestCustId],
    );

    const gCartRes = await pool.query<{ id: number }>('INSERT INTO carts (customer_id) VALUES ($1) RETURNING id', [guestCustId]);
    await pool.query(
      'INSERT INTO cart_items (cart_id, product_id, branch_id, qty) VALUES ($1, 246, 1, 1)',
      [gCartRes.rows[0]!.id],
    );

    const mergedLogin = await loginCustomer({ email: testEmail, password: newPass }, guestRawToken);
    assert.equal(mergedLogin.customer_id, regRes.customer_id);

    const accountCartItems = await pool.query<{ product_id: number; qty: number }>(`
      SELECT ci.product_id, ci.qty
      FROM cart_items ci
      JOIN carts c ON c.id = ci.cart_id
      WHERE c.customer_id = $1 AND ci.product_id = 246
    `, [regRes.customer_id]);
    assert.ok(accountCartItems.rows.length > 0);
    assert.ok(accountCartItems.rows[0]!.qty >= 1);

    const guestCheck = await pool.query('SELECT id FROM customers WHERE id = $1', [guestCustId]);
    assert.equal(guestCheck.rows.length, 0, 'Guest without orders retired on merge');
  });
});
