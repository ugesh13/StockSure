import crypto from 'node:crypto';
import { getPool } from '../db.ts';
import { cfg } from '../config.ts';
import { getPaymentProvider, type PaymentProvider } from '../payments/provider.ts';

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

export class PaymentsService {
  private provider: PaymentProvider;

  constructor(providerName?: string) {
    this.provider = getPaymentProvider(providerName);
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
      const err = new Error('Order not found');
      (err as any).statusCode = 404;
      (err as any).code = 'ORDER_NOT_FOUND';
      throw err;
    }

    const order = orderRes.rows[0];

    if (order.status === 'PLACED' || order.payment_status === 'PAID') {
      const err = new Error('Order is already paid');
      (err as any).statusCode = 400;
      (err as any).code = 'ORDER_ALREADY_PAID';
      throw err;
    }

    if (order.status !== 'AWAITING_PAYMENT') {
      const err = new Error(`Order cannot be paid in current status: ${order.status}`);
      (err as any).statusCode = 400;
      (err as any).code = 'ORDER_NOT_PAYABLE';
      throw err;
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
      amountPaise: order.total_paise,
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
      `SELECT id, customer_id, total_paise, status, payment_status, expires_at 
       FROM orders WHERE id = $1`,
      [orderId]
    );

    if (orderRes.rows.length === 0 || orderRes.rows[0].customer_id !== customerId) {
      const err = new Error('Order not found');
      (err as any).statusCode = 404;
      (err as any).code = 'ORDER_NOT_FOUND';
      throw err;
    }

    const order = orderRes.rows[0];

    // Idempotent replay: already paid
    if (order.status === 'PLACED' || order.payment_status === 'PAID') {
      return { status: 'CAPTURED', paid: true, order_id: orderId };
    }

    // 2. Fetch payment row
    const payRes = await pool.query(
      `SELECT id, provider, provider_order_id, amount_paise, status 
       FROM payments 
       WHERE order_id = $1 AND provider_order_id = $2`,
      [orderId, providerOrderId]
    );

    if (payRes.rows.length === 0) {
      const err = new Error('Payment record not found');
      (err as any).statusCode = 404;
      (err as any).code = 'PAYMENT_NOT_FOUND';
      throw err;
    }

    const payment = payRes.rows[0];

    // 3. Constant-time signature verification
    const isValid = this.provider.verifySignature({
      orderId,
      providerOrderId,
      providerPaymentId,
      signature,
    });

    if (!isValid) {
      await pool.query(
        `UPDATE payments SET status = 'FAILED', updated_at = now() WHERE id = $1`,
        [payment.id]
      );
      const err = new Error('Invalid payment signature');
      (err as any).statusCode = 400;
      (err as any).code = 'INVALID_PAYMENT_SIGNATURE';
      throw err;
    }

    // 4. Check if order hold expired while customer was in payment popup
    const now = new Date();
    const isHoldExpired = order.expires_at && new Date(order.expires_at) < now;

    if (isHoldExpired) {
      // Stock hold expired: try auto-refund
      try {
        await this.provider.refund({
          providerPaymentId,
          amountPaise: payment.amount_paise,
          reason: 'Hold expired during checkout',
        });
      } catch (refundErr) {
        console.error('Auto-refund failed:', refundErr);
      }

      await pool.query(
        `UPDATE payments SET status = 'REFUNDED', provider_payment_id = $1, updated_at = now() WHERE id = $2`,
        [providerPaymentId, payment.id]
      );
      await pool.query(
        `UPDATE orders SET status = 'CANCELLED', payment_status = 'REFUNDED', updated_at = now() WHERE id = $1`,
        [orderId]
      );

      const err = new Error('Order hold expired before payment capture. Payment has been refunded.');
      (err as any).statusCode = 409;
      (err as any).code = 'STOCK_EXPIRED_REFUNDED';
      throw err;
    }

    // 5. Successful capture: update payment and order in single transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE payments 
         SET status = 'CAPTURED', provider_payment_id = $1, updated_at = now() 
         WHERE id = $2`,
        [providerPaymentId, payment.id]
      );

      await client.query(
        `UPDATE orders 
         SET status = 'PLACED', payment_status = 'PAID', paid_at = now(), updated_at = now() 
         WHERE id = $1`,
        [orderId]
      );

      // Record event
      await client.query(
        `INSERT INTO payment_events (provider_event_id, type, payload) 
         VALUES ($1, 'payment.captured', $2) 
         ON CONFLICT (provider_event_id) DO NOTHING`,
        [
          providerPaymentId,
          JSON.stringify({ order_id: orderId, provider_order_id: providerOrderId, amount: payment.amount_paise }),
        ]
      );

      // Insert outbox event for Kafka worker
      await client.query(
        `INSERT INTO outbox (topic, key, payload) 
         VALUES ('orders', $1, $2)`,
        [
          orderId,
          JSON.stringify({
            event_id: crypto.randomUUID(),
            event_type: 'order.paid',
            order_id: orderId,
            customer_id: customerId,
            total_paise: payment.amount_paise,
            provider_payment_id: providerPaymentId,
            timestamp: now.toISOString(),
          }),
        ]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return { status: 'CAPTURED', paid: true, order_id: orderId };
  }

  /**
   * Webhook processor (handles payment.captured, payment.failed, refund.processed)
   */
  async handleWebhook(
    rawBody: string | Buffer,
    signatureHeader: string
  ): Promise<{ received: boolean; event?: string }> {
    const verified = this.provider.verifyWebhook({ rawBody, signatureHeader });
    if (!verified.isValid) {
      const err = new Error('Invalid webhook signature');
      (err as any).statusCode = 400;
      (err as any).code = 'INVALID_WEBHOOK_SIGNATURE';
      throw err;
    }

    const { event, providerOrderId, providerPaymentId, amountPaise, payload } = verified;
    const pool = getPool();
    const eventId = payload?.id || providerPaymentId || `evt_${Date.now()}`;

    // Idempotency: record webhook event
    const insertRes = await pool.query(
      `INSERT INTO payment_events (provider_event_id, type, payload)
       VALUES ($1, $2, $3)
       ON CONFLICT (provider_event_id) DO NOTHING
       RETURNING provider_event_id`,
      [eventId, event || 'unknown', JSON.stringify(payload || {})]
    );

    if (insertRes.rows.length === 0) {
      // Event was already processed
      return { received: true, event };
    }

    if (event === 'payment.captured' && providerOrderId) {
      // Find payment by provider_order_id
      const payRes = await pool.query(
        `SELECT id, order_id, status FROM payments WHERE provider_order_id = $1`,
        [providerOrderId]
      );

      if (payRes.rows.length > 0) {
        const payment = payRes.rows[0];
        if (payment.status !== 'CAPTURED') {
          await pool.query(
            `UPDATE payments 
             SET status = 'CAPTURED', provider_payment_id = $1, updated_at = now() 
             WHERE id = $2`,
            [providerPaymentId, payment.id]
          );
          await pool.query(
            `UPDATE orders 
             SET status = 'PLACED', payment_status = 'PAID', paid_at = now(), updated_at = now() 
             WHERE id = $1`,
            [payment.order_id]
          );
        }
      }
    } else if (event === 'payment.failed' && providerOrderId) {
      await pool.query(
        `UPDATE payments SET status = 'FAILED', updated_at = now() WHERE provider_order_id = $1`,
        [providerOrderId]
      );
    } else if (event === 'refund.processed' && providerPaymentId) {
      await pool.query(
        `UPDATE payments SET status = 'REFUNDED', updated_at = now() WHERE provider_payment_id = $1`,
        [providerPaymentId]
      );
    }

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
      const err = new Error('Order not found');
      (err as any).statusCode = 404;
      (err as any).code = 'ORDER_NOT_FOUND';
      throw err;
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
        amount_paise: order.total_paise,
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
      paid: isPaid || payment.status === 'CAPTURED',
      expires_at: payment.expires_at ? payment.expires_at.toISOString() : undefined,
    };
  }

  /**
   * Process refund on cancellation
   */
  async refundOrder(orderId: string): Promise<boolean> {
    const pool = getPool();
    const payRes = await pool.query(
      `SELECT id, provider, provider_payment_id, amount_paise, status 
       FROM payments 
       WHERE order_id = $1 AND status = 'CAPTURED'`,
      [orderId]
    );

    if (payRes.rows.length === 0) {
      return false;
    }

    const payment = payRes.rows[0];
    if (payment.provider_payment_id) {
      try {
        await this.provider.refund({
          providerPaymentId: payment.provider_payment_id,
          amountPaise: payment.amount_paise,
          reason: 'Order cancelled by customer or staff',
        });
      } catch (err) {
        console.error('Provider refund error:', err);
      }
    }

    await pool.query(
      `UPDATE payments SET status = 'REFUNDED', updated_at = now() WHERE id = $1`,
      [payment.id]
    );
    await pool.query(
      `UPDATE orders SET status = 'CANCELLED', payment_status = 'REFUNDED', updated_at = now() WHERE id = $1`,
      [orderId]
    );

    return true;
  }
}
