import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { cfg } from '../config.ts';
import { getHealth } from '../services/health.ts';
import { getPool, pingPg, withTx } from '../db.ts';
import { replayDlq } from '../kafka/dlq.ts';
import { pingKafka } from '../kafka/client.ts';
import { pingOpenSearch } from '../search/opensearch.ts';
import { reindexAll } from '../search/reindex.ts';
import { ALERT_INSERT_SQL, STOCK_EXISTS_SQL } from '../sql.ts';
import { addToCart, clearCart, getCart, removeItem, setQty } from '../services/cart.ts';
import { getProduct, listBranches, listCategories, listProducts } from '../services/catalog.ts';
import { cancelOrder, checkout, getOrder, listOrders, payOrder } from '../services/orders.ts';
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
import { createSession, deleteCustomerAccount } from '../services/session.ts';
import { authRoutes } from './auth.ts';
import { paymentRoutes } from './payments.ts';
import { mapsRoutes } from './maps.ts';
import { deliveryRoutes } from './delivery.ts';
import { chatRoutes } from './chat.ts';
import { validateDeliveryAddress, getDeliveryQuote, createDeliveryRecord } from '../services/delivery.ts';
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
  address: z.any().optional(),
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
  // ---------- auth ----------
  app.register(authRoutes);
  app.register(paymentRoutes);
  app.register(mapsRoutes);
  app.register(deliveryRoutes);
  app.register(chatRoutes);

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

  // ---------- session & customer ----------
  app.post('/session', LIMIT(20), async (req) => {
    const b = z.object({ name: z.string().max(80).optional() }).parse(req.body ?? {});
    return createSession(b.name);
  });

  app.delete(
    '/me',
    {
      ...LIMIT(10),
      schema: {
        tags: ['Storefront'],
        summary: 'Delete customer account',
        description: 'Delete customer account, active cart, alerts, and sessions, and anonymize user record',
        response: {
          200: {
            type: 'object',
            properties: {
              ok: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (req) => {
      const token = req.headers['x-session-token'];
      const bearer = req.headers.authorization;
      const hasToken = (typeof token === 'string' && token.trim()) || (typeof bearer === 'string' && bearer.startsWith('Bearer ') && bearer.slice(7).trim());
      if (!hasToken) {
        throw new AppError(401, 'SESSION_REQUIRED', 'Session token is required to delete account.');
      }
      const customerId = await customerOf(req);
      return deleteCustomerAccount(customerId);
    },
  );

  // ---------- browse ----------
  app.get('/products', LIMIT(240), async (req) => {
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
  app.get('/products/:id', LIMIT(240), async (req) => getProduct(IdSchema.parse((req.params as { id: string }).id)));
  app.get('/categories', LIMIT(240), async () => ({ categories: await listCategories() }));
  app.get('/branches', LIMIT(240), async () => ({ branches: await listBranches() }));

  // ---------- branches layout & shelves ----------
  app.get('/branches/:id/layout', LIMIT(240), async (req) => {
    const id = IdSchema.parse((req.params as { id: string }).id);
    return getBranchLayout(id);
  });

  app.get('/branches/:id/shelves', LIMIT(240), async (req) => {
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
  app.get('/requests', { ...LIMIT(30), preHandler: requireStaff }, async () => getProductRequests());

  // ---------- cart (stored in Postgres; adding never holds stock) ----------
  app.get('/cart', LIMIT(120), async (req) => getCart(await customerOf(req)));
  app.post('/cart/items', LIMIT(120), async (req, reply) => {
    const b = AddBody.parse(req.body);
    const customerId = await customerOf(req);
    await addToCart(customerId, b.product_id, b.branch_id, b.qty);
    return reply.status(201).send(await getCart(customerId));
  });
  app.patch('/cart/items/:productId/:branchId', LIMIT(120), async (req) => {
    const p = ItemParams.parse(req.params);
    const customerId = await customerOf(req);
    await setQty(customerId, p.productId, p.branchId, QtyBody.parse(req.body).qty);
    return getCart(customerId);
  });
  app.delete('/cart/items/:productId/:branchId', LIMIT(120), async (req) => {
    const p = ItemParams.parse(req.params);
    const customerId = await customerOf(req);
    await removeItem(customerId, p.productId, p.branchId);
    return getCart(customerId);
  });
  app.delete('/cart', LIMIT(120), async (req) => {
    const customerId = await customerOf(req);
    await clearCart(customerId);
    return getCart(customerId);
  });

  // ---------- cart code & kiosk ----------
  app.post('/cart/code', LIMIT(20), async (req) => {
    const customerId = await customerOf(req);
    return createCartCode(customerId);
  });

  app.get('/kiosk/cart/:code', LIMIT(30), async (req) => {
    const { code } = z.object({ code: z.string().min(1).max(32) }).parse(req.params);
    const q = z.object({ branch_id: IdSchema.optional() }).parse(req.query);
    return getKioskCart(code, q.branch_id);
  });

  // ---------- checkout: the guarded reserve ----------
  app.post('/checkout', LIMIT(120), async (req, reply) => {
    const body = CheckoutBody.parse(req.body ?? {});
    const customerId = await customerOf(req);

    let validatedAddress: any = null;
    let quote: any = null;
    if (body.fulfilment === 'DELIVERY') {
      if (!body.address) {
        throw new AppError(422, 'MISSING_ADDRESS', 'Delivery address is required when fulfilment is DELIVERY');
      }
      validatedAddress = validateDeliveryAddress(body.address);
      // Quote against the cart subtotal so the free-delivery threshold actually applies.
      const subtotal = (await getCart(customerId)).total_paise;
      quote = await getDeliveryQuote(validatedAddress.lat, validatedAddress.lng, subtotal);
      if (!quote.serviceable) {
        throw new AppError(400, 'OUT_OF_SERVICE_AREA', quote.reason || 'Address is outside our delivery radius');
      }
      if (!body.branch_id && quote.branch_id) {
        body.branch_id = quote.branch_id;
      }
    }

    const isDelivery = body.fulfilment === 'DELIVERY' && validatedAddress && quote;
    const result = await checkout(customerId, idempotencyKeyOf(req), body.fulfilment, body.branch_id, isDelivery
      ? {
          // The fee is part of what the shopper pays, and the delivery row is written in the same transaction as the order.
          extraPaise: quote.fee_paise || 0,
          afterReserve: async (c, orderId) => {
            await createDeliveryRecord(orderId, body.branch_id || quote.branch_id, validatedAddress, quote.distance_km || 0, quote.fee_paise || 0, c);
          },
        }
      : {});

    return respondCheckout(reply, result, shopperCityOf(req));
  });
  app.post('/orders/:id/pay', LIMIT(30), async (req) => {
    if (cfg().PAYMENT_PROVIDER === 'razorpay') {
      throw new AppError(404, 'ROUTE_DISABLED', 'POST /orders/:id/pay is disabled in Razorpay mode. Use /orders/:id/payment and /orders/:id/payment/verify');
    }
    const { id } = OrderParams.parse(req.params);
    const customerId = await customerOf(req);
    const r = await payOrder(customerId, id);
    return { order: r.order, replay: r.replay };
  });
  app.post('/orders/:id/cancel', LIMIT(30), async (req) => {
    const { id } = OrderParams.parse(req.params);
    const customerId = await customerOf(req);
    return { order: await cancelOrder(customerId, id) };
  });
  app.get(
    '/orders',
    {
      ...LIMIT(120),
      schema: {
        tags: ['Cart & Orders'],
        summary: 'List caller orders',
        description: "List caller's own orders newest first with limit and before cursor",
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', default: 20, minimum: 1, maximum: 50 },
            before: { type: 'string', description: 'ISO 8601 timestamp cursor' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              orders: { type: 'array' },
              next_before: { type: ['string', 'null'] },
            },
          },
        },
      },
    },
    async (req) => {
      const custId = await customerOf(req);
      const q = z
        .object({
          limit: z.coerce.number().int().min(1).max(50).default(20),
          before: z.string().optional(),
        })
        .parse(req.query);
      return listOrders(custId, q, getPool());
    },
  );

  app.get('/orders/:id', LIMIT(120), async (req) => {
    const { id } = OrderParams.parse(req.params);
    const customerId = await customerOf(req);
    return { order: await getOrder(customerId, id, getPool()) };
  });

  // ---------- rescue ----------
  // Options for an order that was released because the store sold the unit first.
  app.get('/orders/:id/rescue', LIMIT(120), async (req) => {
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

  app.post('/alerts/back-in-stock', LIMIT(30), async (req, reply) => {
    const b = z.object({ product_id: IdSchema, branch_id: IdSchema }).parse(req.body);
    const customerId = await customerOf(req);
    const exists = await getPool().query(STOCK_EXISTS_SQL, [b.branch_id, b.product_id]);
    if (exists.rows.length === 0) throw notFound('That product at that branch');
    await getPool().query(ALERT_INSERT_SQL, [customerId, b.product_id, b.branch_id]);
    return reply.status(201).send({ ok: true });
  });

  // ---------- store side (POS and staff): X-Staff-Key ----------
  app.post('/pos/sale', { ...LIMIT(30), preHandler: requireStaff }, async (req) => {
    const b = SaleBody.parse(req.body);
    return posSale(b.branch_id, b.product_id, b.qty);
  });
  app.post('/staff/count', { ...LIMIT(30), preHandler: requireStaff }, async (req) => {
    const b = CountBody.parse(req.body);
    return staffCount(b.branch_id, b.product_id, b.counted);
  });
  app.post('/staff/restock', { ...LIMIT(30), preHandler: requireStaff }, async (req) => {
    const b = RestockBody.parse(req.body);
    return restock(b.branch_id, b.product_id, b.qty);
  });
  app.post('/pos/heartbeat', { ...LIMIT(600), preHandler: requireStaff }, async (req) => {
    const b = z.object({ branch_id: IdSchema }).parse(req.body);
    await heartbeat(b.branch_id);
    return { ok: true };
  });

  // ---------- staff add product ----------
  app.post('/staff/products', { ...LIMIT(30), preHandler: requireStaff }, async (req, reply) => {
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
  app.get('/demo/pipeline', { ...LIMIT(60), preHandler: requireDemoOrStaff }, async () => getPipelineMetrics());
  app.get('/demo/proof/:id', { ...LIMIT(60), preHandler: requireDemoOrStaff }, async (req) => proofFor(OrderParams.parse(req.params).id));
  app.get('/demo/events', { ...LIMIT(60), preHandler: requireDemoOrStaff }, async () => recentEvents());

  // ---------- admin (self-healing): X-Admin-Token ----------
  app.post('/admin/replay-dlq', { ...LIMIT(10), preHandler: requireAdmin }, async () => replayDlq());
  app.post('/admin/reindex', { ...LIMIT(10), preHandler: requireAdmin }, async (req) => {
    const b = z.object({ recreate: z.boolean().default(false) }).parse(req.body ?? {});
    return reindexAll({ recreate: b.recreate });
  });
  app.post('/admin/sync-zoho', { ...LIMIT(10), preHandler: requireAdmin }, async () => syncInventoryWithZoho());
}
