import { loadConfigOrExit, cfg } from '../src/config.ts';
import { closePool, getPool } from '../src/db.ts';
import { buildDoc } from '../src/domain/doc.ts';
import type { DocSource } from '../src/domain/doc.ts';
import { indexDoc, refreshIndex } from '../src/search/opensearch.ts';
import { DOC_SOURCE_SQL } from '../src/sql.ts';
import { cancelOrder } from '../src/services/orders.ts';

loadConfigOrExit(['pg', 'opensearch']);

export async function applyDemoFixture(): Promise<{ cancelledOrders: number; demoProducts: string[] }> {
  const pool = getPool();

  console.log('--- APPLY DEMO FIXTURE START ---');

  // 1. Cancel open orders on DEMO SKUs or from the last 24h via API cancel route (or cancelOrder fallback)
  const openOrdersRes = await pool.query<{ id: string; customer_id: number }>(`
    SELECT DISTINCT o.id, o.customer_id
    FROM orders o
    JOIN order_lines ol ON ol.order_id = o.id
    JOIN products p ON p.id = ol.product_id
    WHERE o.status = 'AWAITING_PAYMENT'
      AND (p.sku LIKE 'DEMO-%' OR o.created_at >= now() - interval '24 hours')
  `);

  let cancelledOrders = 0;
  const baseUrl = process.env.API_URL || 'http://localhost:3000';

  for (const o of openOrdersRes.rows) {
    let ok = false;
    try {
      const res = await fetch(`${baseUrl}/orders/${o.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Customer-Id': String(o.customer_id),
        },
      });
      if (res.ok) ok = true;
    } catch {
      // API not answering; use cancelOrder directly
    }

    if (!ok) {
      try {
        await cancelOrder(o.customer_id, o.id);
        ok = true;
      } catch (err) {
        console.warn(`Could not cancel order ${o.id}:`, err);
      }
    }
    if (ok) cancelledOrders++;
  }
  console.log(`Cancelled ${cancelledOrders} open orders.`);

  // 2. Verify freshness column exists
  const freshnessCol = await pool.query<{ column_name: string }>(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'branches' AND column_name = 'last_heartbeat_at'
  `);
  if (freshnessCol.rows.length === 0) {
    console.error('DEMO-STALE: FAIL, no freshness column');
  }

  // 3. Apply scoped fixture touching ONLY rows whose SKU starts with DEMO-
  // DEMO-RACE: Snake plant 6-inch pot: branch 1 on_hand 1, all other branches 0, reserved 0
  await pool.query(`
    UPDATE inventory SET on_hand = 1, reserved = 0, buffer = 0, rev = rev + 1, updated_at = now()
    WHERE product_id = (SELECT id FROM products WHERE sku = 'DEMO-RACE') AND branch_id = 1
  `);
  await pool.query(`
    UPDATE inventory SET on_hand = 0, reserved = 0, buffer = 0, rev = rev + 1, updated_at = now()
    WHERE product_id = (SELECT id FROM products WHERE sku = 'DEMO-RACE') AND branch_id <> 1
  `);

  // DEMO-RESCUE: Tulsi 6-inch pot: branch 1 on_hand 0, branch 2 on_hand 4, branch 3 on_hand 2
  await pool.query(`
    UPDATE inventory SET on_hand = 0, reserved = 0, buffer = 0, rev = rev + 1, updated_at = now()
    WHERE product_id = (SELECT id FROM products WHERE sku = 'DEMO-RESCUE') AND branch_id = 1
  `);
  await pool.query(`
    UPDATE inventory SET on_hand = 4, reserved = 0, buffer = 0, rev = rev + 1, updated_at = now()
    WHERE product_id = (SELECT id FROM products WHERE sku = 'DEMO-RESCUE') AND branch_id = 2
  `);
  await pool.query(`
    UPDATE inventory SET on_hand = 2, reserved = 0, buffer = 0, rev = rev + 1, updated_at = now()
    WHERE product_id = (SELECT id FROM products WHERE sku = 'DEMO-RESCUE') AND branch_id = 3
  `);
  await pool.query(`
    UPDATE inventory SET on_hand = 0, reserved = 0, buffer = 0, rev = rev + 1, updated_at = now()
    WHERE product_id = (SELECT id FROM products WHERE sku = 'DEMO-RESCUE') AND branch_id > 3
  `);

  // DEMO-OOS: Desert rose 8-inch pot: 0 at every branch
  await pool.query(`
    UPDATE inventory SET on_hand = 0, reserved = 0, buffer = 0, rev = rev + 1, updated_at = now()
    WHERE product_id = (SELECT id FROM products WHERE sku = 'DEMO-OOS')
  `);

  // DEMO-STALE: Marigold 4-inch pot at branch 3: freshness timestamp older than STALE_SECONDS
  await pool.query("UPDATE branches SET last_heartbeat_at = now() - interval '2 hours' WHERE id = 3");
  await pool.query("UPDATE branches SET last_heartbeat_at = now() WHERE id <> 3");

  // DEMO-HOLD: Aloe vera 6-inch pot: branch 1 on_hand 2
  await pool.query(`
    UPDATE inventory SET on_hand = 2, reserved = 0, buffer = 0, rev = rev + 1, updated_at = now()
    WHERE product_id = (SELECT id FROM products WHERE sku = 'DEMO-HOLD') AND branch_id = 1
  `);

  // 4. Refresh OpenSearch documents for DEMO- SKUs
  const demoProducts = ['DEMO-RACE', 'DEMO-RESCUE', 'DEMO-OOS', 'DEMO-STALE', 'DEMO-HOLD'];
  const branches = await pool.query<{ id: number }>('SELECT id FROM branches ORDER BY id');

  for (const sku of demoProducts) {
    const prodRes = await pool.query<{ id: number }>('SELECT id FROM products WHERE sku = $1', [sku]);
    const prodId = prodRes.rows[0]?.id;
    if (!prodId) continue;

    for (const b of branches.rows) {
      const srcRes = await pool.query<Omit<DocSource, 'on_hand' | 'reserved' | 'buffer' | 'rev'>>(
        DOC_SOURCE_SQL,
        [prodId, b.id],
      );
      const base = srcRes.rows[0];
      if (!base) continue;

      const invRes = await pool.query<{ on_hand: number; reserved: number; buffer: number; rev: number }>(
        'SELECT on_hand, reserved, buffer, rev FROM inventory WHERE product_id = $1 AND branch_id = $2',
        [prodId, b.id],
      );
      const inv = invRes.rows[0] ?? { on_hand: 0, reserved: 0, buffer: 0, rev: 0 };

      // J4 intentional divergence: DEMO-OOS at branch 1 is indexed as in-stock in OpenSearch
      if (sku === 'DEMO-OOS' && b.id === 1) {
        const fakeDoc = buildDoc(
          { ...base, on_hand: 5, reserved: 0, buffer: 0, rev: inv.rev },
          cfg().LOW_STOCK,
          new Date().toISOString(),
        );
        await indexDoc(fakeDoc);
      } else {
        const doc = buildDoc(
          { ...base, on_hand: inv.on_hand, reserved: inv.reserved, buffer: inv.buffer, rev: inv.rev },
          cfg().LOW_STOCK,
          new Date().toISOString(),
        );
        await indexDoc(doc);
      }
    }
  }

  await refreshIndex();

  console.log('--- APPLY DEMO FIXTURE COMPLETE ---');
  return { cancelledOrders, demoProducts };
}

// CLI entry
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile)) {
  applyDemoFixture()
    .then(() => closePool())
    .catch((err) => {
      console.error('Demo fixture error:', err);
      process.exit(1);
    });
}
