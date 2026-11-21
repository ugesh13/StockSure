import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.ts';
import { customerOf } from '../src/routes/common.ts';
import { AppError } from '../src/errors.ts';
import * as dbModule from '../src/db.ts';

test('F2: Impersonation & Production Auth Controls', async (t) => {
  // Ensure config loaded for test environment
  loadConfig(['api'], { STAFF_KEY: 'test-staff-key-12345', ADMIN_TOKEN: 'test-admin-token-12345' });

  t.afterEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.DEMO_MODE;
    dbModule._setPoolForTesting(undefined);
  });

  await t.test('1. Production + header only -> 401 SESSION_REQUIRED', async () => {
    process.env.NODE_ENV = 'production';
    process.env.DEMO_MODE = 'true';

    const req = { headers: { 'x-customer-id': '5' } } as any;
    await assert.rejects(
      async () => customerOf(req),
      (err: AppError) => {
        assert.equal(err.status, 401);
        assert.equal(err.code, 'SESSION_REQUIRED');
        return true;
      }
    );
  });

  await t.test('2. Development + header only -> allowed (returns customer ID)', async () => {
    process.env.NODE_ENV = 'development';
    process.env.DEMO_MODE = 'true';

    const req = { headers: { 'x-customer-id': '5' } } as any;
    const custId = await customerOf(req);
    assert.equal(custId, 5);
  });

  await t.test('3. Wrong token + matching header -> 401 BAD_SESSION', async () => {
    process.env.NODE_ENV = 'development';
    process.env.DEMO_MODE = 'true';

    // Mock pool to return empty rows (nonexistent session) without hitting real DB
    dbModule._setPoolForTesting({
      query: async () => ({ rows: [] }),
    });

    const req = {
      headers: {
        'x-customer-id': '5',
        'x-session-token': 'bad-token-0123456789abcdef0123456789abcdef',
      },
    } as any;

    await assert.rejects(
      async () => customerOf(req),
      (err: AppError) => {
        assert.equal(err.status, 401);
        assert.equal(err.code, 'BAD_SESSION');
        return true;
      }
    );
  });
});
