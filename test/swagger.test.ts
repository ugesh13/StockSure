import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { buildApp } from '../src/app.ts';
import { loadConfigOrExit } from '../src/config.ts';
import { closePool } from '../src/db.ts';

loadConfigOrExit(['pg', 'api']);

describe('Swagger Documentation (/docs)', () => {
  let app: any;

  before(async () => {
    app = await buildApp();
  });

  after(async () => {
    await app.close();
    await closePool();
  });

  it('1. GET /docs serves Swagger UI HTML', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/docs/',
    });
    assert.equal(res.statusCode, 200);
    assert.match(res.headers['content-type'] ?? '', /text\/html/);
    assert.match(res.body, /swagger-ui/i);
  });

  it('2. GET /docs/json serves OpenAPI spec with documented auth headers and demo routes', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/docs/json',
    });
    assert.equal(res.statusCode, 200);
    const spec = JSON.parse(res.body);

    assert.equal(spec.info?.title, 'StockSure API');

    // Documented security schemes
    const sec = spec.components?.securitySchemes;
    assert.ok(sec, 'components.securitySchemes exists');
    assert.ok(sec.sessionToken, 'sessionToken documented');
    assert.equal(sec.sessionToken.name, 'X-Session-Token');
    assert.ok(sec.customerId, 'customerId documented');
    assert.equal(sec.customerId.name, 'X-Customer-Id');
    assert.ok(sec.staffKey, 'staffKey documented');
    assert.equal(sec.staffKey.name, 'X-Staff-Key');
    assert.ok(sec.adminToken, 'adminToken documented');
    assert.equal(sec.adminToken.name, 'X-Admin-Token');

    // Documented tags
    const tags = spec.tags?.map((t: any) => t.name) ?? [];
    assert.ok(tags.includes('Demo'), 'Demo tag documented');
    assert.ok(tags.includes('Storefront'), 'Storefront tag documented');

    // Routes present in spec
    assert.ok(spec.paths['/demo/pipeline'], '/demo/pipeline present in OpenAPI spec');
    assert.ok(spec.paths['/demo/events'], '/demo/events present in OpenAPI spec');
    assert.ok(spec.paths['/health'], '/health present in OpenAPI spec');
  });
});
