import { getPool } from '../db.ts';
import { cfg } from '../config.ts';

export type ZohoConfig = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  orgId: string;
  accountsUrl: string;
  apiUrl: string;
  timeoutMs?: number;
};

export type ZohoItemWarehouseStock = {
  warehouse_id: string;
  warehouse_name: string;
  warehouse_stock_on_hand: number;
};

export type ZohoItem = {
  item_id: string;
  name: string;
  sku?: string;
  stock_on_hand?: number;
  warehouses?: ZohoItemWarehouseStock[];
};

export type ZohoStockRow = {
  sku: string;
  warehouse_id?: string;
  warehouse_name?: string;
  stock_on_hand: number;
};

export type SyncResult = {
  success: boolean;
  source: 'zoho' | 'fallback_pos';
  updated: number;
  unmapped: number;
  message: string;
  errors?: string[];
};

let tokenCache: { token: string; expiresAt: number } | null = null;

export function clearTokenCache(): void {
  tokenCache = null;
}

export function getZohoConfigFromEnv(): ZohoConfig | null {
  const clientId = process.env.ZOHO_CLIENT_ID || '';
  const clientSecret = process.env.ZOHO_CLIENT_SECRET || '';
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN || '';
  const orgId = process.env.ZOHO_ORG_ID || '';
  const accountsUrl = process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.in';
  const apiUrl = process.env.ZOHO_API_URL || 'https://www.zohoapis.in/inventory/v1';

  if (!clientId || !clientSecret || !refreshToken) return null;

  return {
    clientId,
    clientSecret,
    refreshToken,
    orgId,
    accountsUrl,
    apiUrl,
    timeoutMs: 6000,
  };
}

/**
 * Exchange refresh token for an access token.
 * Caches in memory until ~5 minutes (300 s) before expiry.
 * Never logs secrets.
 */
export async function getAccessToken(config: ZohoConfig, fetchFn = fetch): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now) {
    return tokenCache.token;
  }

  const url = `${config.accountsUrl.replace(/\/+$/, '')}/oauth/v2/token`;
  const params = new URLSearchParams({
    refresh_token: config.refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'refresh_token',
  });

  const res = await fetchFn(`${url}?${params.toString()}`, {
    method: 'POST',
    signal: AbortSignal.timeout(config.timeoutMs ?? 6000),
  });

  if (!res.ok) {
    throw new Error(`Zoho token exchange failed with HTTP ${res.status}`);
  }

  const data = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!data.access_token) {
    throw new Error(`Zoho token exchange returned no token: ${data.error ?? 'unknown error'}`);
  }

  // Zoho tokens expire in 3600 seconds; cache until 5 minutes before expiry (min 60s)
  const expiresInSec = data.expires_in ?? 3600;
  const ttlMs = Math.max((expiresInSec - 300) * 1000, 60_000);
  tokenCache = {
    token: data.access_token,
    expiresAt: now + ttlMs,
  };

  return data.access_token;
}

/**
 * Perform an authenticated Zoho API request with automatic 401 retry and timeout.
 */
export async function zohoFetch<T>(
  endpoint: string,
  config: ZohoConfig,
  options: RequestInit = {},
  fetchFn = fetch,
): Promise<T> {
  let token = await getAccessToken(config, fetchFn);
  const url = `${config.apiUrl.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;

  const makeHeaders = (authToken: string) => {
    const h: Record<string, string> = {
      Authorization: `Zoho-oauthtoken ${authToken}`,
      Accept: 'application/json',
      ...(config.orgId ? { 'X-com-zoho-inventory-organizationid': config.orgId } : {}),
      ...(options.headers as Record<string, string> | undefined),
    };
    return h;
  };

  let res = await fetchFn(url, {
    ...options,
    headers: makeHeaders(token),
    signal: AbortSignal.timeout(config.timeoutMs ?? 6000),
  });

  // Retry once on 401
  if (res.status === 401) {
    clearTokenCache();
    token = await getAccessToken(config, fetchFn);
    res = await fetchFn(url, {
      ...options,
      headers: makeHeaders(token),
      signal: AbortSignal.timeout(config.timeoutMs ?? 6000),
    });
  }

  if (!res.ok) {
    throw new Error(`Zoho API call ${endpoint} failed with HTTP ${res.status}`);
  }

  return (await res.json()) as T;
}

/**
 * Pulls item stock per warehouse from Zoho Inventory.
 */
export async function pullItemStock(config: ZohoConfig, fetchFn = fetch): Promise<ZohoStockRow[]> {
  const data = await zohoFetch<{
    code: number;
    items?: ZohoItem[];
  }>('items?include=warehouses', config, {}, fetchFn);

  const rows: ZohoStockRow[] = [];
  for (const item of data.items ?? []) {
    const sku = item.sku || item.name;
    if (item.warehouses && item.warehouses.length > 0) {
      for (const wh of item.warehouses) {
        rows.push({
          sku,
          warehouse_id: wh.warehouse_id,
          warehouse_name: wh.warehouse_name,
          stock_on_hand: wh.warehouse_stock_on_hand,
        });
      }
    } else if (item.stock_on_hand !== undefined) {
      rows.push({
        sku,
        stock_on_hand: item.stock_on_hand,
      });
    }
  }

  return rows;
}

/**
 * Maps Zoho item stock per warehouse into StockSure's inventory table.
 * Treat Zoho as the stock source (updating on_hand), and our guarded reserve
 * (reserved and buffer) remains untouched as the checkout safety layer.
 * Idempotent: repeating with same numbers yields identical state.
 */
export async function syncZohoStockToBranches(
  stockRows: ZohoStockRow[],
): Promise<{ updated: number; unmapped: number }> {
  const pool = getPool();

  // Load product SKU mapping
  const prods = await pool.query<{ id: number; sku: string }>('SELECT id, sku FROM products');
  const skuMap = new Map(prods.rows.map((p) => [p.sku.toLowerCase(), p.id]));

  // Load branches
  const branches = await pool.query<{ id: number; name: string }>('SELECT id, name FROM branches');
  const branchMap = new Map(branches.rows.map((b) => [b.name.toLowerCase(), b.id]));

  let updated = 0;
  let unmapped = 0;

  for (const row of stockRows) {
    const productId = skuMap.get(row.sku.toLowerCase());
    if (!productId) {
      unmapped++;
      continue;
    }

    // Determine target branch
    let targetBranchId: number | undefined;
    if (row.warehouse_name) {
      targetBranchId = branchMap.get(row.warehouse_name.toLowerCase());
    }
    if (!targetBranchId && row.warehouse_id) {
      const num = parseInt(row.warehouse_id, 10);
      if (!isNaN(num) && branches.rows.some((b) => b.id === num)) {
        targetBranchId = num;
      }
    }

    // If no specific warehouse match, update branch 1 by default
    const branchId = targetBranchId ?? 1;

    // Update on_hand only; guarded reserve (reserved & buffer) remains untouched!
    const res = await pool.query(
      `UPDATE inventory
          SET on_hand = $1,
              rev = rev + 1,
              updated_at = now()
        WHERE branch_id = $2
          AND product_id = $3`,
      [Math.max(0, row.stock_on_hand), branchId, productId],
    );

    if ((res.rowCount ?? 0) > 0) {
      updated++;
    } else {
      unmapped++;
    }
  }

  return { updated, unmapped };
}

/**
 * Full sync operation: pulls from Zoho and maps to inventory.
 * If Zoho is unreachable or unconfigured, falls back gracefully to the POS simulator.
 * Idempotent. Never logs secrets.
 */
export async function syncInventoryWithZoho(
  customConfig?: ZohoConfig | null,
  fetchFn = fetch,
): Promise<SyncResult> {
  const config = customConfig ?? getZohoConfigFromEnv();

  if (!config) {
    // Graceful fallback to POS simulator
    return {
      success: true,
      source: 'fallback_pos',
      updated: 0,
      unmapped: 0,
      message: 'Zoho credentials not configured; falling back to POS simulator.',
    };
  }

  try {
    const stockRows = await pullItemStock(config, fetchFn);
    const { updated, unmapped } = await syncZohoStockToBranches(stockRows);

    return {
      success: true,
      source: 'zoho',
      updated,
      unmapped,
      message: `Successfully synchronized ${updated} stock rows from Zoho Inventory.`,
    };
  } catch (err: any) {
    // Log error name without logging secrets or config values
    return {
      success: true,
      source: 'fallback_pos',
      updated: 0,
      unmapped: 0,
      message: `Zoho unreachable (${err.message}); falling back to POS simulator.`,
      errors: [err.message],
    };
  }
}
