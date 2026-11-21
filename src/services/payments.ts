import crypto from 'node:crypto';
import type { PoolClient } from 'pg';
import { getPool, withTx } from '../db.ts';
import { cfg } from '../config.ts';
import { AppError } from '../errors.ts';
import { enqueue } from '../events.ts';
import { log, errFields } from '../log.ts';
import { CLEAR_CART_SQL, ORDER_LINES_FOR_STOCK_SQL } from '../sql.ts';
import type { StockLine } from '../domain/lines.ts';
import { getPaymentProvider, type PaymentProvider } from '../payments/provider.ts';
import { releaseHold } from './orders.ts';

export interface CreatePaymentResponse {
  provider: string;
  provider_order_id: string;
  amount_paise: number;
  currency: string;
  key_id: string;
  expires_at: string;
}

export interface PaymentStatusResponse {
  order_id: string;
  status: string;
  provider: string;
  provider_order_id?: string;
  amount_paise: number;
  paid: boolean;
  expires_at?: string;
}

const orderNotFound = () => new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');

type CaptureOutcome =
  | { kind: 'captured'; replay: boolean }
  | { kind: 'refund'; providerPaymentId: string; amountPaise: number; paymentRowId: string };

/**
 * Turn a verified provider payment into a placed order. ONE transaction, with the order row locked, so it can never
 * race the sweeper, a new checkout cancelling this hold, or a POS conflict moving it to NEEDS_RESCUE.
 *
 * Only an order still AWAITING_PAYMENT with a live hold may become PLACED. That is the same rule as PAY_SQL, so the
 * reserved stock is guaranteed to still be held. Anything else (hold expired, cancelled, needs rescue) is refunded.
 * A placed order emits the standard `order.placed` event, so the inventory-finalizer deducts stock exactly as for the
 * mock /pay route.
 */
async function captureInTx(
  c: PoolClient,
  orderId: string,
  paymentRowId: string,
  amountPaise: number,
  providerPaymentId: string,
): Promise<CaptureOutcome> {
  const cur = await c.query<{ customer_id: number; status: string; payment_status: string | null; live: boolean }>(
    `SELECT customer_id, status, payment_status, (expires_at > now()) AS live FROM orders WHERE id = $1 FOR UPDATE`,
    [orderId],
  );
  const order = cur.rows[0];
  if (!order) throw orderNotFound();

  if (order.status === 'PLACED') {
    // Already placed (by this payment earlier, or by a webhook). Record the payment id, nothing else to do.
    await c.query(
      `UPDATE payments SET status = 'CAPTURED', provider_payment_id = COALESCE(provider_payment_id, $1), updated_at = now() WHERE id = $2`,
      [providerPaymentId, paymentRowId],
    );
    return { kind: 'captured', replay: true };
  }

  if (order.status === 'AWAITING_PAYMENT' && order.live) {
    await c.query(
      `UPDATE payments SET status = 'CAPTURED', provider_payment_id = $1, updated_at = now() WHERE id = $2`,
      [providerPaymentId, paymentRowId],
    );
    await c.query(
      `UPDATE orders SET status = 'PLACED', payment_status = 'PAID', paid_at = now(), updated_at = now() WHERE id = $1`,
      [orderId],
    );
    const lines = (await c.query<StockLine>(ORDER_LINES_FOR_STOCK_SQL, [orderId])).rows;
    if (lines.length > 0) {
      await enqueue(c, 'orders', orderId, 'order.placed', { order_id: orderId, customer_id: order.customer_id, lines });
    }
    await c.query(CLEAR_CART_SQL, [order.customer_id]);
    await c.query(
      `UPDATE deliveries SET status = 'CONFIRMED' WHERE order_id = $1 AND status = 'PENDING_PAYMENT'`,
      [orderId],
    );
    await c.query(
      `INSERT INTO delivery_events (delivery_id, status, note)
       SELECT id, 'CONFIRMED', 'Payment received' FROM deliveries WHERE order_id = $1 AND status = 'CONFIRMED'
         AND NOT EXISTS (SELECT 1 FROM delivery_events e WHERE e.delivery_id = deliveries.id AND e.status = 'CONFIRMED')`,
      [orderId],
    );
    return { kind: 'captured', replay: false };
  }

  // The hold is gone (or about to be). Give the stock back if we still hold it, and refund the shopper.
  if (order.status === 'AWAITING_PAYMENT') {
    const released = await releaseHold(c, orderId, 'CANCELLED');
    if (released && released.lines.length > 0) {
      await enqueue(c, 'orders', orderId, 'order.expired', { order_id: orderId, customer_id: released.customerId, lines: released.lines });
    }
  }
  await c.query(`UPDATE orders SET payment_status = 'REFUNDED', updated_at = now() WHERE id = $1`, [orderId]);
  await c.query(
    `UPDATE payments SET status = 'REFUND_PENDING', provider_payment_id = $1, updated_at = now() WHERE id = $2`,
    [providerPaymentId, paymentRowId],
  );
  return { kind: 'refund', providerPaymentId, amountPaise, paymentRowId };
}

export class PaymentsService {
  private provider: PaymentProvider;

  constructor(providerName?: string) {
    this.provider = getPaymentProvider(providerName);
  }

  /** Refund outside the transaction (it is a network call), then record the result. */
  private async refundAfterCommit(o: Extract<CaptureOutcome, { kind: 'refund' }>, reason: string): Promise<void> {
    let status = 'REFUNDED';
    try {
      await this.provider.refund({ providerPaymentId: o.providerPaymentId, amountPaise: o.amountPaise, reason });
    } catch (e) {
      status = 'REFUND_FAILED';
      log('error', 'auto-refund failed, needs manual refund', { payment_id: o.paymentRowId, ...errFields(e) });
    }
    await getPool().query(`UPDATE payments SET status = $1, updated_at = now() WHERE id = $2`, [status, o.paymentRowId]);
  }

  /**
   * Create or return an active payment attempt for an order
   */
  async createPayment(orderId: string, customerId: number): Promise<CreatePaymentResponse> {
    const pool = getPool();

    // 1. Validate order and check ownership (IDOR safe -> 404)
    const orderRes = await pool.query(
      `SELECT id, customer_id, total_paise, status, payment_status, expires_at
       FROM orders WHERE id = $1`,
      [orderId]
    );

    if (orderRes.rows.length === 0 || orderRes.rows[0].customer_id !== customerId) {
      throw orderNotFound();
    }

    const order = orderRes.rows[0];

    if (order.status === 'PLACED' || order.payment_status === 'PAID') {
      throw new AppError(400, 'ORDER_ALREADY_PAID', 'Order is already paid');
    }

    if (order.status !== 'AWAITING_PAYMENT') {
      throw new AppError(400, 'ORDER_NOT_PAYABLE', `Order cannot be paid in current status: ${order.status}`);
    }

    // 2. Check for an existing open payment attempt (idempotency)
    const existingPaymentRes = await pool.query(
      `SELECT id, provider, provider_order_id, amount_paise, currency, status, expires_at
       FROM payments
       WHERE order_id = $1 AND status = 'CREATED' AND expires_at > now()
       ORDER BY created_at DESC LIMIT 1`,
      [orderId]
    );

    if (existingPaymentRes.rows.length > 0) {
      const p = existingPaymentRes.rows[0];
      return {
        provider: p.provider,
        provider_order_id: p.provider_order_id,
        amount_paise: p.amount_paise,
        currency: p.currency,
        key_id: (this.provider as any).keyId || '',
        expires_at: p.expires_at.toISOString(),
      };
    }

    // 3. Create order with provider using DB total_paise (tamper-proof)
    const created = await this.provider.createOrder({
      orderId,
      amountPaise: Number(order.total_paise),
      currency: 'INR',
      receipt: `rcpt_${orderId.replace(/-/g, '').slice(0, 16)}`,
    });

    let ttlMinutes = 15;
    try { ttlMinutes = cfg().PAYMENT_TTL_MINUTES || 15; } catch { ttlMinutes = 15; }
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    const paymentId = `pay_${crypto.randomUUID().replace(/-/g, '')}`;

    await pool.query(
      `INSERT INTO payments (id, order_id, provider, provider_order_id, amount_paise, currency, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'CREATED', $7)`,
      [paymentId, orderId, created.provider, created.providerOrderId, created.amountPaise, created.currency, expiresAt]
    );

    return {
      provider: created.provider,
      provider_order_id: created.providerOrderId,
      amount_paise: created.amountPaise,
      currency: created.currency,
      key_id: created.keyId,
      expires_at: expiresAt.toISOString(),
    };
  }

  /**
   * Verify signature callback from client
   */
  async verifyPayment(
    orderId: string,
    customerId: number,
    providerOrderId: string,
    providerPaymentId: string,
    signature: string
  ): Promise<{ status: string; paid: boolean; order_id: string }> {
    const pool = getPool();

    // 1. IDOR check
    const orderRes = await pool.query(
      `SELECT id, customer_id, status, payment_status FROM orders WHERE id = $1`,
      [orderId]
    );

    if (orderRes.rows.length === 0 || orderRes.rows[0].customer_id !== customerId) {
      throw orderNotFound();
    }

    const order = orderRes.rows[0];

    // Idempotent replay: already paid
    if (order.status === 'PLACED' || order.payment_status === 'PAID') {
      return { status: 'CAPTURED', paid: true, order_id: orderId };
    }

    // 2. Fetch payment row
    const payRes = await pool.query<{ id: string; amount_paise: number }>(
      `SELECT id, amount_paise FROM payments WHERE order_id = $1 AND provider_order_id = $2`,
      [orderId, providerOrderId]
    );

    const payment = payRes.rows[0];
    if (!payment) {
      throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Payment record not found');
    }

    // 3. Constant-time signature verification
    const isValid = this.provider.verifySignature({ orderId, providerOrderId, providerPaymentId, signature });

    if (!isValid) {
      await pool.query(`UPDATE payments SET status = 'FAILED', updated_at = now() WHERE id = $1 AND status = 'CREATED'`, [payment.id]);
      throw new AppError(400, 'INVALID_PAYMENT_SIGNATURE', 'Invalid payment signature');
    }

    // 4. Capture under a row lock. Refund instead if the hold no longer exists.
    const outcome = await withTx((c) => captureInTx(c, orderId, payment.id, Number(payment.amount_paise), providerPaymentId));

    if (outcome.kind === 'refund') {
      await this.refundAfterCommit(outcome, 'Hold expired during checkout');
      throw new AppError(409, 'STOCK_EXPIRED_REFUNDED', 'Order hold expired before payment capture. Payment has been refunded.');
    }

    await pool.query(
      `INSERT INTO payment_events (provider_event_id, type, payload)
       VALUES ($1, 'payment.captured', $2)
       ON CONFLICT (provider_event_id) DO NOTHING`,
      [`verify:${providerPaymentId}`, JSON.stringify({ order_id: orderId, provider_order_id: providerOrderId, amount: payment.amount_paise })],
    );

    return { status: 'CAPTURED', paid: true, order_id: orderId };
  }

  /**
   * Webhook processor (handles payment.captured, payment.failed, refund.processed).
   * `eventIdHeader` is Razorpay's X-Razorpay-Event-Id; the body itself carries no unique event id.
   */
  async handleWebhook(
    rawBody: string | Buffer,
    signatureHeader: string,
    eventIdHeader?: string,
  ): Promise<{ received: boolean; event?: string }> {
    const verified = this.provider.verifyWebhook({ rawBody, signatureHeader });
    if (!verified.isValid) {
      throw new AppError(400, 'INVALID_WEBHOOK_SIGNATURE', 'Invalid webhook signature');
    }

    const { event, providerOrderId, providerPaymentId, payload } = verified;
    // Never fall back to the payment id alone: payment.captured and refund.processed share it.
    const eventId = eventIdHeader || payload?.id || `${event ?? 'unknown'}:${providerPaymentId ?? providerOrderId ?? crypto.randomUUID()}`;

    // Record the event and apply it in one transaction: a crash mid-way lets the provider's retry run it again.
    const outcome = await withTx(async (c): Promise<CaptureOutcome | null> => {
      const insertRes = await c.query(
        `INSERT INTO payment_events (provider_event_id, type, payload)
         VALUES ($1, $2, $3)
         ON CONFLICT (provider_event_id) DO NOTHING
         RETURNING provider_event_id`,
        [eventId, event || 'unknown', JSON.stringify(payload || {})]
      );
      if (insertRes.rows.length === 0) return null; // already processed

      if (event === 'payment.captured' && providerOrderId && providerPaymentId) {
        const payRes = await c.query<{ id: string; order_id: string; amount_paise: number; status: string }>(
          `SELECT id, order_id, amount_paise, status FROM payments WHERE provider_order_id = $1`,
          [providerOrderId]
        );
        const payment = payRes.rows[0];
        if (payment && payment.status !== 'CAPTURED' && !payment.status.startsWith('REFUND')) {
          return captureInTx(c, payment.order_id, payment.id, Number(payment.amount_paise), providerPaymentId);
        }
      } else if (event === 'payment.failed' && providerOrderId) {
        await c.query(
          `UPDATE payments SET status = 'FAILED', updated_at = now() WHERE provider_order_id = $1 AND status = 'CREATED'`,
          [providerOrderId]
        );
      } else if (event === 'refund.processed' && providerPaymentId) {
        await c.query(
          `UPDATE payments SET status = 'REFUNDED', updated_at = now() WHERE provider_payment_id = $1`,
          [providerPaymentId]
        );
      }
      return null;
    });

    if (outcome?.kind === 'refund') await this.refundAfterCommit(outcome, 'Hold expired before payment capture');

    return { received: true, event };
  }

  /**
   * Get payment status for polling / refresh
   */
  async getPaymentStatus(orderId: string, customerId: number): Promise<PaymentStatusResponse> {
    const pool = getPool();

    const orderRes = await pool.query(
      `SELECT id, customer_id, total_paise, status, payment_status FROM orders WHERE id = $1`,
      [orderId]
    );

    if (orderRes.rows.length === 0 || orderRes.rows[0].customer_id !== customerId) {
      throw orderNotFound();
    }

    const order = orderRes.rows[0];
    const isPaid = order.status === 'PLACED' || order.payment_status === 'PAID';

    const payRes = await pool.query(
      `SELECT provider, provider_order_id, amount_paise, status, expires_at
       FROM payments
       WHERE order_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [orderId]
    );

    if (payRes.rows.length === 0) {
      return {
        order_id: orderId,
        status: isPaid ? 'CAPTURED' : 'PENDING',
        provider: this.provider.name,
        amount_paise: Number(order.total_paise),
        paid: isPaid,
      };
    }

    const payment = payRes.rows[0];
    return {
      order_id: orderId,
      status: payment.status,
      provider: payment.provider,
      provider_order_id: payment.provider_order_id,
      amount_paise: payment.amount_paise,
      paid: isPaid,
      expires_at: payment.expires_at ? payment.expires_at.toISOString() : undefined,
    };
  }
}
