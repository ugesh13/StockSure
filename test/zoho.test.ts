import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import {
  clearTokenCache,
  getAccessToken,
  zohoFetch,
  pullItemStock,
  syncInventoryWithZoho,
  type ZohoConfig,
} from '../src/integrations/zoho.ts';

const mockConfig: ZohoConfig = {
  clientId: 'mock-client-123',
  clientSecret: 'mock-secret-456',
  refreshToken: 'mock-refresh-789',
  orgId: 'mock-org-101112',
  accountsUrl: 'https://accounts.zoho.mock',
  apiUrl: 'https://api.zoho.mock/v1',
  timeoutMs: 1000,
};

describe('Zoho Inventory Integration Adapter', () => {
  beforeEach(() => {
    clearTokenCache();
  });

  it('1. Token exchange and caching: caches token and does not call token endpoint twice', async () => {
    let tokenCalls = 0;

    const mockFetch = (async (url: string | URL | Request, init?: RequestInit) => {
      tokenCalls++;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'mock-access-token-abc',
          expires_in: 3600,
        }),
      } as any;
    }) as typeof fetch;

    // First call fetches from auth endpoint
    const token1 = await getAccessToken(mockConfig, mockFetch);
    assert.equal(token1, 'mock-access-token-abc');
    assert.equal(tokenCalls, 1);

    // Second call uses cached token without network request
    const token2 = await getAccessToken(mockConfig, mockFetch);
    assert.equal(token2, 'mock-access-token-abc');
    assert.equal(tokenCalls, 1);
  });

  it('2. Retry once on 401: refreshes token and retries request on 401 unauthorized', async () => {
    let tokenCalls = 0;
    let apiCalls = 0;

    const mockFetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.includes('/oauth/v2/token')) {
        tokenCalls++;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            access_token: `refreshed-token-${tokenCalls}`,
            expires_in: 3600,
          }),
        } as any;
      }

      if (urlStr.includes('/items')) {
        apiCalls++;
        if (apiCalls === 1) {
          // First attempt returns 401
          return {
            ok: false,
            status: 401,
            json: async () => ({ code: 401, message: 'Invalid OAuth token' }),
          } as any;
        }
        // Second attempt with refreshed token succeeds
        return {
          ok: true,
          status: 200,
          json: async () => ({ code: 0, items: [] }),
        } as any;
      }

      throw new Error(`Unexpected URL: ${urlStr}`);
    }) as typeof fetch;

    const data = await zohoFetch<{ code: number }>('items', mockConfig, {}, mockFetch);
    assert.equal(data.code, 0);
    assert.equal(apiCalls, 2);
    assert.equal(tokenCalls, 2);
  });

  it('3. Pull item stock per warehouse: extracts SKU and warehouse stock quantities', async () => {
    const mockFetch = (async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes('/oauth/v2/token')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ access_token: 'valid-token', expires_in: 3600 }),
        } as any;
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({
          code: 0,
          items: [
            {
              item_id: 'item-1',
              name: 'boAt Airdopes 141',
              sku: 'SS-AUD-001',
              warehouses: [
                { warehouse_id: '1', warehouse_name: 'StockSure Koramangala', warehouse_stock_on_hand: 50 },
                { warehouse_id: '2', warehouse_name: 'StockSure Indiranagar', warehouse_stock_on_hand: 30 },
              ],
            },
            {
              item_id: 'item-2',
              name: 'realme Buds T110',
              sku: 'SS-AUD-002',
              stock_on_hand: 15,
            },
          ],
        }),
      } as any;
    }) as typeof fetch;

    const rows = await pullItemStock(mockConfig, mockFetch);
    assert.equal(rows.length, 3);
    assert.equal(rows[0].sku, 'SS-AUD-001');
    assert.equal(rows[0].warehouse_id, '1');
    assert.equal(rows[0].stock_on_hand, 50);
    assert.equal(rows[2].sku, 'SS-AUD-002');
    assert.equal(rows[2].stock_on_hand, 15);
  });

  it('4. Fallback when unconfigured: returns fallback_pos when Zoho config is missing', async () => {
    const result = await syncInventoryWithZoho(null);
    assert.equal(result.success, true);
    assert.equal(result.source, 'fallback_pos');
    assert.match(result.message, /falling back to POS simulator/);
  });

  it('5. Fallback on network failure: gracefully falls back to POS simulator if Zoho times out or fails', async () => {
    const failingFetch = (async () => {
      throw new Error('Connection timed out after 1000ms');
    }) as typeof fetch;

    const result = await syncInventoryWithZoho(mockConfig, failingFetch);
    assert.equal(result.success, true);
    assert.equal(result.source, 'fallback_pos');
    assert.match(result.message, /Zoho unreachable/);
    // Secrets must never be leaked in error messages
    assert.ok(!JSON.stringify(result).includes(mockConfig.clientSecret));
    assert.ok(!JSON.stringify(result).includes(mockConfig.refreshToken));
  });
});
