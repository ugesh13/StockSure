import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearTokenCache,
  getAccessToken,
  zohoFetch,
  type ZohoConfig,
} from '../src/integrations/zoho.ts';

const mockConfig: ZohoConfig = {
  clientId: 'mock-client-id',
  clientSecret: 'mock-client-secret',
  refreshToken: 'mock-refresh-token',
  orgId: 'mock-org-id',
  accountsUrl: 'https://accounts.zoho.mock',
  apiUrl: 'https://api.zoho.mock/v1',
  timeoutMs: 1000,
};

test('F8: Zoho Mocked Adapter (No Network)', async (t) => {
  t.beforeEach(() => {
    clearTokenCache();
  });

  await t.test('1. Token refresh returns access token from mocked auth endpoint', async () => {
    let callCount = 0;
    const mockFetch = (async (url: string | URL | Request) => {
      callCount++;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'fresh-mock-token-xyz',
          expires_in: 3600,
        }),
      } as any;
    }) as typeof fetch;

    const token = await getAccessToken(mockConfig, mockFetch);
    assert.equal(token, 'fresh-mock-token-xyz');
    assert.equal(callCount, 1);
  });

  await t.test('2. 401 retry: invalidates cached token, refreshes token, and retries request', async () => {
    let attempts = 0;
    const mockFetch = (async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes('/oauth/v2/token')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            access_token: 'refreshed-token-456',
            expires_in: 3600,
          }),
        } as any;
      }
      attempts++;
      if (attempts === 1) {
        return {
          ok: false,
          status: 401,
          text: async () => 'Unauthorized',
        } as any;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ code: 0, message: 'success', data: [] }),
      } as any;
    }) as typeof fetch;

    const res = await zohoFetch<{ code: number }>('/items', mockConfig, {}, mockFetch);
    assert.equal(res.code, 0);
    assert.equal(attempts, 2);
  });

  await t.test('3. Error path: throws descriptive error on non-401 failure', async () => {
    const mockFetch = (async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes('/oauth/v2/token')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ access_token: 'token-abc', expires_in: 3600 }),
        } as any;
      }
      return {
        ok: false,
        status: 500,
        text: async () => 'Internal Zoho Server Error',
      } as any;
    }) as typeof fetch;

    await assert.rejects(
      async () => zohoFetch('/items', mockConfig, {}, mockFetch),
      /Zoho API call \/items failed with HTTP 500/
    );
  });
});
