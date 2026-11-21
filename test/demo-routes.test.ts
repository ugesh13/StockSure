import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { buildApp } from '../src/app.ts';
import { cfg, loadConfigOrExit } from '../src/config.ts';
import { closePool } from '../src/db.ts';

loadConfigOrExit(['pg', 'api']);

describe('Demo Routes Protection (/demo/*)', () => {
  let app: any;
  const staffKey = cfg().STAFF_KEY;

  before(async () => {
    app = await buildApp();
  });

  after(async () => {
    await app.close();
    await closePool();
  });

  it('1. Rejects with 401 when DEMO_MODE=false and no staff key is provided', async () => {
    process.env.DEMO_MODE = 'false';

    const resPipeline = await app.inject({
      method: 'GET',
      url: '/demo/pipeline',
    });
    assert.equal(resPipeline.statusCode, 401);
    assert.equal(JSON.parse(resPipeline.body).error?.code, 'UNAUTHORIZED');

    const resEvents = await app.inject({
      method: 'GET',
      url: '/demo/events',
    });
    assert.equal(resEvents.statusCode, 401);
    assert.equal(JSON.parse(resEvents.body).error?.code, 'UNAUTHORIZED');

    const resProof = await app.inject({
      method: 'GET',
      url: '/demo/proof/00000000-0000-0000-0000-000000000000',
    });
    assert.equal(resProof.statusCode, 401);
    assert.equal(JSON.parse(resProof.body).error?.code, 'UNAUTHORIZED');
  });

  it('2. Rejects with 401 when DEMO_MODE=false and wrong staff key is provided', async () => {
    process.env.DEMO_MODE = 'false';

    const res = await app.inject({
      method: 'GET',
      url: '/demo/pipeline',
      headers: {
        'x-staff-key': 'incorrect-staff-secret-key',
      },
    });
    assert.equal(res.statusCode, 401);
    assert.equal(JSON.parse(res.body).error?.code, 'UNAUTHORIZED');
  });

  it('3. Allows access when DEMO_MODE=false with valid X-Staff-Key header', async () => {
    process.env.DEMO_MODE = 'false';

    const res = await app.inject({
      method: 'GET',
      url: '/demo/pipeline',
      headers: {
        'x-staff-key': staffKey,
      },
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.ok(typeof body.healthy === 'boolean');
  });

  it('4. Allows access without staff key when DEMO_MODE=true', async () => {
    process.env.DEMO_MODE = 'true';

    const resPipeline = await app.inject({
      method: 'GET',
      url: '/demo/pipeline',
    });
    assert.equal(resPipeline.statusCode, 200);

    const resEvents = await app.inject({
      method: 'GET',
      url: '/demo/events',
    });
    assert.equal(resEvents.statusCode, 200);
    assert.ok(Array.isArray(JSON.parse(resEvents.body).outbox));
  });
});
