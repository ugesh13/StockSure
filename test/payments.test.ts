import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { MockProvider, RazorpayProvider } from '../src/payments/provider.ts';
import { PaymentsService } from '../src/services/payments.ts';
import { getPool } from '../src/db.ts';
import { loadConfigOrExit } from '../src/config.ts';

loadConfigOrExit(['pg']);

describe('P0-PAY Payments Unit Tests & Security Rules', () => {
  const mockProvider = new MockProvider();

  it('1. MockProvider generates valid signature and validates with constant-time check', () => {
    const orderId = 'order_123';
    const providerOrderId = 'mock_order_123';
    const providerPaymentId = 'mock_pay_123';

    const sig = mockProvider.generateSignature(providerOrderId, providerPaymentId);
    assert.ok(sig && typeof sig === 'string');

    // Valid check
    const valid = mockProvider.verifySignature({
      orderId,
      providerOrderId,
      providerPaymentId,
      signature: sig,
    });
    assert.equal(valid, true);

    // Tampered signature
    const tampered = mockProvider.verifySignature({
      orderId,
      providerOrderId,
      providerPaymentId,
      signature: 'bad_signature_' + sig.slice(14),
    });
    assert.equal(tampered, false);
  });

  it('2. Webhook HMAC verification succeeds on valid secret and rejects invalid payload', () => {
    const payload = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'p1', amount: 50000 } } } });
    const sig = mockProvider.generateWebhookSignature(payload);

    const validResult = mockProvider.verifyWebhook({
      rawBody: payload,
      signatureHeader: sig,
    });
    assert.equal(validResult.isValid, true);
    assert.equal(validResult.event, 'payment.captured');
    assert.equal(validResult.providerPaymentId, 'p1');

    const tamperedResult = mockProvider.verifyWebhook({
      rawBody: payload + 'tampered',
      signatureHeader: sig,
    });
    assert.equal(tamperedResult.isValid, false);
  });

  it('3. PaymentsService end-to-end: IDOR check, tamper-proof amount, idempotency, and capture', async () => {
    const pool = getPool();
    const paymentsService = new PaymentsService('mock');
    const customerA = 1;
    const customerB = 2;
    const orderId = crypto.randomUUID();
    const totalPaise = 299900;

    await pool.query(
      `INSERT INTO orders (id, customer_id, total_paise, status, payment_status, fulfilment, idempotency_key, expires_at)
       VALUES ($1, $2, $3, 'AWAITING_PAYMENT', 'PENDING', 'PICKUP', $4, now() + interval '15 minutes')`,
      [orderId, customerA, totalPaise, `idem_${crypto.randomUUID()}`]
    );

    try {
      // 1. IDOR prevention: Customer B receives 404
      await assert.rejects(
        async () => {
          await paymentsService.createPayment(orderId, customerB);
        },
        (err: any) => err.statusCode === 404 && err.code === 'ORDER_NOT_FOUND'
      );

      // 2. Customer A creates attempt: amount matches DB total_paise
      const attempt1 = await paymentsService.createPayment(orderId, customerA);
      assert.equal(attempt1.amount_paise, totalPaise);
      assert.ok(attempt1.provider_order_id);

      // 3. Idempotent call returns identical active attempt
      const attempt2 = await paymentsService.createPayment(orderId, customerA);
      assert.equal(attempt2.provider_order_id, attempt1.provider_order_id);

      // 4. Verify payment with valid signature
      const payId = `pay_${Date.now()}`;
      const sig = mockProvider.generateSignature(attempt1.provider_order_id, payId);
      const verifyRes = await paymentsService.verifyPayment(
        orderId,
        customerA,
        attempt1.provider_order_id,
        payId,
        sig
      );
      assert.equal(verifyRes.paid, true);
      assert.equal(verifyRes.status, 'CAPTURED');

      // 5. Verify order is updated in DB
      const dbOrder = await pool.query('SELECT status, payment_status FROM orders WHERE id = $1', [orderId]);
      assert.equal(dbOrder.rows[0].status, 'PLACED');
      assert.equal(dbOrder.rows[0].payment_status, 'PAID');
    } finally {
      await pool.query('DELETE FROM payments WHERE order_id = $1', [orderId]);
      await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
    }
  });

  it('4. Payment after hold expiry triggers auto-refund and 409 error', async () => {
    const pool = getPool();
    const paymentsService = new PaymentsService('mock');
    const customerA = 1;
    const orderId = crypto.randomUUID();
    const totalPaise = 150000;

    // Order with hold already expired (expires_at in past)
    await pool.query(
      `INSERT INTO orders (id, customer_id, total_paise, status, payment_status, fulfilment, idempotency_key, expires_at)
       VALUES ($1, $2, $3, 'AWAITING_PAYMENT', 'PENDING', 'PICKUP', $4, now() - interval '5 minutes')`,
      [orderId, customerA, totalPaise, `idem_${crypto.randomUUID()}`]
    );

    try {
      const attempt = await paymentsService.createPayment(orderId, customerA);
      const payId = `pay_expired_${Date.now()}`;
      const sig = mockProvider.generateSignature(attempt.provider_order_id, payId);

      await assert.rejects(
        async () => {
          await paymentsService.verifyPayment(orderId, customerA, attempt.provider_order_id, payId, sig);
        },
        (err: any) => err.statusCode === 409 && err.code === 'STOCK_EXPIRED_REFUNDED'
      );

      // Check DB order is refunded
      const dbOrder = await pool.query('SELECT status, payment_status FROM orders WHERE id = $1', [orderId]);
      assert.equal(dbOrder.rows[0].status, 'CANCELLED');
      assert.equal(dbOrder.rows[0].payment_status, 'REFUNDED');
    } finally {
      await pool.query('DELETE FROM payments WHERE order_id = $1', [orderId]);
      await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
    }
  });
});
