import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { cfg } from '../config.ts';
import { customerOf } from './common.ts';
import { PaymentsService } from '../services/payments.ts';
import { AppError } from '../errors.ts';

const OrderIdParam = z.object({
  id: z.string().uuid(),
});

const VerifyPaymentBody = z.object({
  provider_order_id: z.string().min(1),
  provider_payment_id: z.string().min(1),
  signature: z.string().min(1),
});

export async function paymentRoutes(app: FastifyInstance): Promise<void> {
  const paymentsService = new PaymentsService();

  // 1. Create payment attempt (idempotent, amount from DB)
  app.post('/orders/:id/payment', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = OrderIdParam.parse(req.params);
    const customerId = await customerOf(req);

    const payment = await paymentsService.createPayment(id, customerId);
    return reply.status(200).send(payment);
  });

  // 2. Verify payment signature from client callback
  app.post('/orders/:id/payment/verify', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = OrderIdParam.parse(req.params);
    const customerId = await customerOf(req);
    const body = VerifyPaymentBody.parse(req.body);

    const result = await paymentsService.verifyPayment(
      id,
      customerId,
      body.provider_order_id,
      body.provider_payment_id,
      body.signature
    );

    return reply.status(200).send(result);
  });

  // 3. Get payment status (for polling / popup closed check)
  app.get('/orders/:id/payment', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = OrderIdParam.parse(req.params);
    const customerId = await customerOf(req);

    const status = await paymentsService.getPaymentStatus(id, customerId);
    return reply.status(200).send(status);
  });

  // 4. Razorpay webhook handler
  app.post('/webhooks/razorpay', async (req: FastifyRequest, reply: FastifyReply) => {
    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    if (!signature) {
      throw new AppError(400, 'MISSING_WEBHOOK_SIGNATURE', 'Missing x-razorpay-signature header');
    }

    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    const result = await paymentsService.handleWebhook(rawBody, signature);
    return reply.status(200).send(result);
  });
}
