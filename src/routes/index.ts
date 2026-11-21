import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getHealth } from '../services/health.ts';
import { getPool, pingPg, withTx } from '../db.ts';
import { replayDlq } from '../kafka/dlq.ts';
import { pingKafka } from '../kafka/client.ts';
import { pingOpenSearch } from '../search/opensearch.ts';
import { reindexAll } from '../search/reindex.ts';
import { ALERT_INSERT_SQL, STOCK_EXISTS_SQL } from '../sql.ts';
import { addToCart, clearCart, getCart, removeItem, setQty } from '../services/cart.ts';
import { getProduct, listBranches, listCategories, listProducts } from '../services/catalog.ts';
import { cancelOrder, checkout, getOrder, payOrder } from '../services/orders.ts';
import { heartbeat, posSale, restock, staffCount } from '../services/pos.ts';
import { proofFor, recentEvents } from '../services/proof.ts';
import { applyRescueToCart, rescueForOrder } from '../services/rescue.ts';
import type { PricedLine } from '../services/orders.ts';
import { searchProducts } from '../services/search.ts';
import { SearchQuery } from '../domain/searchParams.ts';
import { AppError, notFound } from '../errors.ts';
import { withTimeout } from '../util.ts';
import { syncInventoryWithZoho } from '../integrations/zoho.ts';
import { IdSchema, UuidSchema, customerOf, idempotencyKeyOf, requireAdmin, requireDemoOrStaff, requireStaff, respondCheckout, shopperCityOf } from './common.ts';
import { createSession } from '../services/session.ts';
import {
  registerCustomer,
  loginCustomer,
  getCustomerProfile,
  logoutSession,
} from '../services/auth.ts';
import {
  addProductRequest,
  getProductRequests,
  createCartCode,
  getBranchLayout,
  getBranchShelves,
  getKioskCart,
  getPipelineMetrics,
  staffAddProduct,
} from '../services/storeLayout.ts';

const LIMIT = (max: number) => ({ config: { rateLimit: { max, timeWindow: '1 minute' } } });

const Qty = z.number().int().min(1).max(10);
const AddBody = z.object({ product_id: IdSchema, branch_id: IdSchema, qty: Qty.default(1) });
const QtyBody = z.object({ qty: Qty });
const ItemParams = z.object({ productId: IdSchema, branchId: IdSchema });
const CheckoutBody = z.object({
  fulfilment: z.enum(['PICKUP', 'DELIVERY', 'IN_STORE']).default('PICKUP'),
  branch_id: IdSchema.optional(),
});
const OrderParams = z.object({ id: UuidSchema });

const RescueBody = z.object({
  order_id: UuidSchema.optional(),
  fulfilment: z.enum(['PICKUP', 'DELIVERY', 'IN_STORE']).default('PICKUP'),
  branch_id: IdSchema.optional(),
  choice: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('SWAP'),
      from: z.object({ product_id: IdSchema, branch_id: IdSchema }),
      to: z.object({ product_id: IdSchema, branch_id: IdSchema }),
    }),
    z.object({ type: z.literal('ONE_BRANCH'), branch_id: IdSchema }),
    z.object({
      type: z.literal('SPLIT'),
      assignments: z
        .array(z.object({ product_id: IdSchema, from_branch_id: IdSchema, to_branch_id: IdSchema, qty: Qty }))
        .min(1)
        .max(20),
    }),
  ]),
});

const StaffItem = z.object({ branch_id: IdSchema, product_id: IdSchema });
const SaleBody = StaffItem.extend({ qty: Qty });
const CountBody = StaffItem.extend({ counted: z.number().int().min(0).max(100_000) });
const RestockBody = StaffItem.extend({ qty: z.number().int().min(1).max(100_000) });

async function check(fn: () => Promise<Record<string, unknown>>): Promise<Record<string, unknown>> {
  const t = Date.now();
  try {
    return { ok: true, ms: Date.now() - t, ...(await withTimeout(fn(), 4000, 'health check')) };
  } catch (e) {
    const code = (e as { code?: string }).code;
    return { ok: false, ms: Date.now() - t, error: code ?? (e instanceof Error ? e.message.slice(0, 120) : 'unavailable') };
  }
}

export function registerRoutes(app: FastifyInstance): void {
  // ---------- health ----------
  app.get('/health', async (_req, reply) => {
    const h = getHealth();
    return reply.status(h.ok ? 200 : 503).send({
      status: h.status,
      ok: h.ok,
      kafka_patch: h.kafka_patch,
      services: h.services,
      time: h.time,
    });
  });

  // ---------- session & authentication ----------
  app.post('/session', LIMIT(20), async (req) => {
    const b = z.object({ name: z.string().max(80).optional() }).parse(req.body ?? {});
    return createSession(b.name);
  });

  app.post('/auth/register', LIMIT(20), async (req) => {
    const b = z
      .object({
        email: z.string().email(),
        password: z.string().min(6).max(100),
        name: z.string().min(1).max(80),
        phone: z.string().max(20).optional(),
      })
      .parse(req.body ?? {});
    return registerCustomer(b);
  });

  app.post('/auth/login', LIMIT(30), async (req) => {
    const b = z
      .object({
        email: z.string().email(),
        password: z.string().min(1).max(100),
      })
      .parse(req.body ?? {});
    return loginCustomer(b);
  });

  app.get('/auth/me', LIMIT(120), async (req) => {
    const customerId = await customerOf(req);
    return getCustomerProfile(customerId);
  });

  app.post('/auth/logout', LIMIT(60), async (req) => {
    const token = req.headers['x-session-token'];
    if (typeof token === 'string' && token.trim()) {
      return logoutSession(token);
    }
    return { ok: true, message: 'No active session' };
  });

  // ---------- browse ----------
  app.get('/products', async (req) => {
    const q = z
      .object({
        category: z.string().max(40).optional(),
        city: z.string().max(60).optional(),
        page: z.coerce.number().int().min(1).max(1000).default(1),
        pageSize: z.coerce.number().int().min(1).max(60).default(24),
      })
      .parse(req.query);
    return listProducts(q);
  });
  app.get('/products/:id', async (req) => getProduct(IdSchema.parse((req.params as { id: string }).id)));
  app.get('/categories', async () => ({ categories: await listCategories() }));
  app.get('/branches', async () => ({ branches: await listBranches() }));

  // ---------- branches layout & shelves ----------
  app.get('/branches/:id/layout', async (req) => {
    const id = IdSchema.parse((req.params as { id: string }).id);
    return getBranchLayout(id);
  });

  app.get('/branches/:id/shelves', async (req) => {
    const id = IdSchema.parse((req.params as { id: string }).id);
    const q = z.object({ since: z.string().optional() }).parse(req.query);
    return getBranchShelves(id, q.since);
  });

  // ---------- search ----------
  app.get('/search', LIMIT(120), async (req) => searchProducts(SearchQuery.parse(req.query)));

  // ---------- requests ----------
  app.post('/requests', LIMIT(60), async (req, reply) => {
    const b = z.object({ query: z.string().min(1).max(200) }).parse(req.body);
    const r = await addProductRequest(b.query);
    return reply.status(201).send(r);
  });
  app.get('/requests', { preHandler: requireStaff }, async () => getProductRequests());

  // ---------- cart (stored in Postgres; adding never holds stock) ----------
  app.get('/cart', async (req) => getCart(await customerOf(req)));
  app.post('/cart/items', async (req, reply) => {
    const b = AddBody.parse(req.body);
    const customerId = await customerOf(req);
    await addToCart(customerId, b.product_id, b.branch_id, b.qty);
    return reply.status(201).send(await getCart(customerId));
  });
  app.patch('/cart/items/:productId/:branchId', async (req) => {
    const p = ItemParams.parse(req.params);
    const customerId = await customerOf(req);
    await setQty(customerId, p.productId, p.branchId, QtyBody.parse(req.body).qty);
    return getCart(customerId);
  });
  app.delete('/cart/items/:productId/:branchId', async (req) => {
    const p = ItemParams.parse(req.params);
    const customerId = await customerOf(req);
    await removeItem(customerId, p.productId, p.branchId);
    return getCart(customerId);
  });
  app.delete('/cart', async (req) => {
    const customerId = await customerOf(req);
    await clearCart(customerId);
    return getCart(customerId);
  });

  // ---------- cart code & kiosk ----------
  app.post('/cart/code', async (req) => {
    const customerId = await customerOf(req);
    return createCartCode(customerId);
  });

  app.get('/kiosk/cart/:code', async (req) => {
    const { code } = z.object({ code: z.string().min(1).max(32) }).parse(req.params);
    const q = z.object({ branch_id: IdSchema.optional() }).parse(req.query);
    return getKioskCart(code, q.branch_id);
  });

  // ---------- checkout: the guarded reserve ----------
  app.post('/checkout', LIMIT(120), async (req, reply) => {
    const body = CheckoutBody.parse(req.body ?? {});
    const customerId = await customerOf(req);
    const result = await checkout(customerId, idempotencyKeyOf(req), body.fulfilment, body.branch_id);
    return respondCheckout(reply, result, shopperCityOf(req));
  });
  app.post('/orders/:id/pay', async (req) => {
    const { id } = OrderParams.parse(req.params);
    const customerId = await customerOf(req);
    const r = await payOrder(customerId, id);
    return { order: r.order, replay: r.replay };
  });
  app.post('/orders/:id/cancel', async (req) => {
    const { id } = OrderParams.parse(req.params);
    const customerId = await customerOf(req);
    return { order: await cancelOrder(customerId, id) };
  });
  app.get('/orders/:id', async (req) => {
    const { id } = OrderParams.parse(req.params);
    const customerId = await customerOf(req);
    return { order: await getOrder(customerId, id, getPool()) };
  });

  // ---------- rescue ----------
  // Options for an order that was released because the store sold the unit first.
  app.get('/orders/:id/rescue', async (req) => {
    const { id } = OrderParams.parse(req.params);
    const customerId = await customerOf(req);
    const order = await getOrder(customerId, id, getPool());
    if (order.status !== 'NEEDS_RESCUE') throw new AppError(409, 'NOT_RESCUABLE', `Order is ${order.status}, not NEEDS_RESCUE.`);
    const lines: PricedLine[] = order.lines.map((l) => ({ branch_id: l.branch_id, product_id: l.product_id, qty: l.qty, unit_price_paise: l.unit_price_paise }));
    return { order_id: id, ...(await rescueForOrder(lines, shopperCityOf(req))) };
  });

  app.post('/rescue/apply', LIMIT(60), async (req, reply) => {
    const body = RescueBody.parse(req.body);
    const customerId = await customerOf(req);
    const key = idempotencyKeyOf(req);
    await withTx((c) => applyRescueToCart(c, customerId, body.choice, body.order_id));
    const result = await checkout(customerId, key, body.fulfilment, body.branch_id);
    return respondCheckout(reply, result, shopperCityOf(req));
  });

  app.post('/alerts/back-in-stock', async (req, reply) => {
    const b = z.object({ product_id: IdSchema, branch_id: IdSchema }).parse(req.body);
    const customerId = await customerOf(req);
    const exists = await getPool().query(STOCK_EXISTS_SQL, [b.branch_id, b.product_id]);
    if (exists.rows.length === 0) throw notFound('That product at that branch');
    await getPool().query(ALERT_INSERT_SQL, [customerId, b.product_id, b.branch_id]);
    return reply.status(201).send({ ok: true });
  });

  // ---------- store side (POS and staff): X-Staff-Key ----------
  app.post('/pos/sale', { preHandler: requireStaff }, async (req) => {
    const b = SaleBody.parse(req.body);
    return posSale(b.branch_id, b.product_id, b.qty);
  });
  app.post('/staff/count', { preHandler: requireStaff }, async (req) => {
    const b = CountBody.parse(req.body);
    return staffCount(b.branch_id, b.product_id, b.counted);
  });
  app.post('/staff/restock', { preHandler: requireStaff }, async (req) => {
    const b = RestockBody.parse(req.body);
    return restock(b.branch_id, b.product_id, b.qty);
  });
  app.post('/pos/heartbeat', { preHandler: requireStaff }, async (req) => {
    const b = z.object({ branch_id: IdSchema }).parse(req.body);
    await heartbeat(b.branch_id);
    return { ok: true };
  });

  // ---------- staff add product ----------
  app.post('/staff/products', { preHandler: requireStaff }, async (req, reply) => {
    const b = z
      .object({
        name: z.string().min(1).max(200),
        brand: z.string().min(1).max(100),
        category: z.string().min(1).max(40),
        price_paise: z.number().int().positive(),
        stock: z.array(z.object({ branch_id: IdSchema, qty: z.number().int().min(0) })).default([]),
      })
      .parse(req.body);
    const result = await staffAddProduct(b);
    return reply.status(201).send(result);
  });

  // ---------- proof panel & pipeline ----------
  app.get('/demo/pipeline', { preHandler: requireDemoOrStaff }, async () => getPipelineMetrics());
  app.get('/demo/proof/:id', { preHandler: requireDemoOrStaff }, async (req) => proofFor(OrderParams.parse(req.params).id));
  app.get('/demo/events', { preHandler: requireDemoOrStaff }, async () => recentEvents());

  // ---------- admin (self-healing): X-Admin-Token ----------
  app.post('/admin/replay-dlq', { preHandler: requireAdmin }, async () => replayDlq());
  app.post('/admin/reindex', { preHandler: requireAdmin }, async (req) => {
    const b = z.object({ recreate: z.boolean().default(false) }).parse(req.body ?? {});
    return reindexAll({ recreate: b.recreate });
  });
  app.post('/admin/sync-zoho', { preHandler: requireAdmin }, async () => syncInventoryWithZoho());
}
