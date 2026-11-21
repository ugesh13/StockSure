import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';
import { closePool, _setPoolForTesting } from '../src/db.ts';

test('F4: Swagger Exposure Controls', async (t) => {
  t.afterEach(async () => {
    delete process.env.NODE_ENV;
    delete process.env.DOCS_ENABLED;
    _setPoolForTesting(undefined);
    await closePool();
  });

  await t.test('1. Production without DOCS_ENABLED -> 404 on /docs and /docs/json', async () => {
    process.env.NODE_ENV = 'production';
    process.env.DOCS_ENABLED = 'false';
    loadConfig(['pg', 'api'], {
      DATABASE_URL: 'postgres://localhost/dummy',
      STAFF_KEY: 'test-staff-key-12345',
      ADMIN_TOKEN: 'test-admin-token-12345',
      NODE_ENV: 'production',
      DOCS_ENABLED: 'false',
    });

    const app = await buildApp();
    try {
      const resDocs = await app.inject({ method: 'GET', url: '/docs' });
      assert.equal(resDocs.statusCode, 404);
      const resJson = await app.inject({ method: 'GET', url: '/docs/json' });
      assert.equal(resJson.statusCode, 404);
    } finally {
      await app.close();
    }
  });

  await t.test('2. Production with DOCS_ENABLED=true -> /docs is registered', async () => {
    process.env.NODE_ENV = 'production';
    process.env.DOCS_ENABLED = 'true';
    loadConfig(['pg', 'api'], {
      DATABASE_URL: 'postgres://localhost/dummy',
      STAFF_KEY: 'test-staff-key-12345',
      ADMIN_TOKEN: 'test-admin-token-12345',
      NODE_ENV: 'production',
      DOCS_ENABLED: 'true',
    });

    const app = await buildApp();
    try {
      const resDocs = await app.inject({ method: 'GET', url: '/docs' });
      // /docs typically redirects (302) to /docs/ or returns 200
      assert.ok(resDocs.statusCode === 200 || resDocs.statusCode === 302);
    } finally {
      await app.close();
    }
  });

  await t.test('3. Development -> /docs is registered by default', async () => {
    process.env.NODE_ENV = 'development';
    process.env.DOCS_ENABLED = 'false';
    loadConfig(['pg', 'api'], {
      DATABASE_URL: 'postgres://localhost/dummy',
      STAFF_KEY: 'test-staff-key-12345',
      ADMIN_TOKEN: 'test-admin-token-12345',
      NODE_ENV: 'development',
      DOCS_ENABLED: 'false',
    });

    const app = await buildApp();
    try {
      const resDocs = await app.inject({ method: 'GET', url: '/docs' });
      assert.ok(resDocs.statusCode === 200 || resDocs.statusCode === 302);
    } finally {
      await app.close();
    }
  });
});
