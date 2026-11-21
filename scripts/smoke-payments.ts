import { loadConfigOrExit } from '../src/config.ts';
import { getPool, closePool } from '../src/db.ts';
import { PaymentsService } from '../src/services/payments.ts';
import { MockProvider } from '../src/payments/provider.ts';
import crypto from 'node:crypto';

loadConfigOrExit(['pg']);

async function main() {
  console.log('--- Starting Smoke Payments Verification ---');
  const pool = getPool();
  const paymentsService = new PaymentsService('mock');
  const mockProvider = new MockProvider();

  // Setup test customer and order
  const customerA = 1;
  const customerB = 2;
  const orderId = crypto.randomUUID();
  const totalPaise = 149900; // Rs 1499.00

  const idemKey = `idem_${crypto.randomUUID()}`;
  await pool.query(
    `INSERT INTO orders (id, customer_id, total_paise, status, payment_status, fulfilment, idempotency_key, expires_at)
     VALUES ($1, $2, $3, 'AWAITING_PAYMENT', 'PENDING', 'PICKUP', $4, now() + interval '15 minutes')`,
    [orderId, customerA, totalPaise, idemKey]
  );

  console.log('1. Created order:', orderId);

  // Test IDOR protection: customer B cannot create payment for customer A's order
  try {
    await paymentsService.createPayment(orderId, customerB);
    console.error('FAIL: Customer B was able to create payment for Customer A order');
    process.exit(1);
  } catch (err: any) {
    if (err.statusCode === 404 && err.code === 'ORDER_NOT_FOUND') {
      console.log('PASS: IDOR check correctly blocked Customer B with 404 ORDER_NOT_FOUND');
    } else {
      console.error('FAIL: Expected 404 ORDER_NOT_FOUND, got:', err);
      process.exit(1);
    }
  }

  // Customer A creates payment attempt
  const paymentAttempt = await paymentsService.createPayment(orderId, customerA);
  console.log('2. Payment attempt created:', paymentAttempt.provider_order_id, 'Amount:', paymentAttempt.amount_paise);
  if (paymentAttempt.amount_paise !== totalPaise) {
    console.error('FAIL: Amount mismatch, expected:', totalPaise, 'got:', paymentAttempt.amount_paise);
    process.exit(1);
  }
  console.log('PASS: Amount matches database order amount (tamper-proof)');

  // Idempotent second call returns same provider order
  const paymentAttempt2 = await paymentsService.createPayment(orderId, customerA);
  if (paymentAttempt2.provider_order_id !== paymentAttempt.provider_order_id) {
    console.error('FAIL: Expected idempotent provider_order_id match');
    process.exit(1);
  }
  console.log('PASS: Idempotent payment creation returns active open attempt');

  // Test tampered signature rejection
  const providerPaymentId = `mock_pay_${Date.now()}`;
  const tamperedSig = 'invalid_signature_hex_1234567890abcdef';
  try {
    await paymentsService.verifyPayment(orderId, customerA, paymentAttempt.provider_order_id, providerPaymentId, tamperedSig);
    console.error('FAIL: Tampered signature was accepted');
    process.exit(1);
  } catch (err: any) {
    if (err.statusCode === 400 && err.code === 'INVALID_PAYMENT_SIGNATURE') {
      console.log('PASS: Tampered signature rejected with 400 INVALID_PAYMENT_SIGNATURE');
    } else {
      console.error('FAIL: Expected 400 INVALID_PAYMENT_SIGNATURE, got:', err);
      process.exit(1);
    }
  }

  // Valid signature verification
  const validSig = mockProvider.generateSignature(paymentAttempt.provider_order_id, providerPaymentId);
  const verifyResult = await paymentsService.verifyPayment(
    orderId,
    customerA,
    paymentAttempt.provider_order_id,
    providerPaymentId,
    validSig
  );

  if (verifyResult.paid && verifyResult.status === 'CAPTURED') {
    console.log('PASS: Payment successfully verified and marked CAPTURED');
  } else {
    console.error('FAIL: Verification result unexpected:', verifyResult);
    process.exit(1);
  }

  // Idempotent replay of verification
  const verifyReplay = await paymentsService.verifyPayment(
    orderId,
    customerA,
    paymentAttempt.provider_order_id,
    providerPaymentId,
    validSig
  );
  if (verifyReplay.paid) {
    console.log('PASS: Verification replay handled idempotently');
  } else {
    console.error('FAIL: Replay failed');
    process.exit(1);
  }

  // Webhook idempotency test
  const webhookPayload = {
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: `webhook_${providerPaymentId}`,
          order_id: paymentAttempt.provider_order_id,
          amount: totalPaise,
        },
      },
    },
  };
  const rawBody = JSON.stringify(webhookPayload);
  const webhookSig = mockProvider.generateWebhookSignature(rawBody);

  const webhookResult = await paymentsService.handleWebhook(rawBody, webhookSig);
  if (webhookResult.received) {
    console.log('PASS: Webhook successfully received and processed');
  } else {
    console.error('FAIL: Webhook processing failed');
    process.exit(1);
  }

  // Duplicate webhook delivery returns received: true without error
  const webhookDuplicate = await paymentsService.handleWebhook(rawBody, webhookSig);
  if (webhookDuplicate.received) {
    console.log('PASS: Duplicate webhook delivery handled idempotently');
  } else {
    console.error('FAIL: Duplicate webhook failed');
    process.exit(1);
  }

  // Clean up test order
  await pool.query('DELETE FROM payments WHERE order_id = $1', [orderId]);
  await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);

  console.log('--- ALL PAYMENT SMOKE TESTS PASSED ---');
  await closePool();
}

main().catch((err) => {
  console.error('Smoke test failed with unhandled error:', err);
  process.exit(1);
});
