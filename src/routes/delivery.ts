import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { customerOf, requireStaff, UuidSchema } from './common.ts';
import {
  getDeliveryQuote,
  getOrderTracking,
  updateDeliveryStatus,
  updateDeliveryLocation,
  reportOrderIssue,
  validateDeliveryAddress,
} from '../services/delivery.ts';
import { AppError } from '../errors.ts';

const QuoteQuery = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  amount_paise: z.coerce.number().int().min(0).default(0),
});

const DeliveryStatusBody = z.object({
  status: z.enum([
    'PENDING_PAYMENT',
    'CONFIRMED',
    'PACKED',
    'OUT_FOR_DELIVERY',
    'FAILED_ATTEMPT',
    'DELIVERED',
    'CANCELLED',
    'RETURNED',
  ]),
  note: z.string().max(500).optional(),
  handover_code: z.string().length(4).optional(),
});

const DeliveryLocationBody = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  rider_name: z.string().max(100).optional(),
  rider_phone: z.string().max(20).optional(),
});

const OrderIssueBody = z.object({
  reason: z.enum(['DAMAGED', 'WRONG_PLANT', 'DEAD_ON_ARRIVAL', 'NOT_DELIVERED']),
  note: z.string().min(5).max(1000),
});

export async function deliveryRoutes(app: FastifyInstance) {
  // Public delivery quote
  app.get('/delivery/quote', async (req) => {
    const q = QuoteQuery.parse(req.query);
    return getDeliveryQuote(q.lat, q.lng, q.amount_paise);
  });

  // Customer order tracking
  app.get('/orders/:id/tracking', async (req) => {
    const { id } = z.object({ id: UuidSchema }).parse(req.params);
    const customerId = await customerOf(req);
    return getOrderTracking(id, customerId);
  });

  // Staff update delivery status
  app.patch(
    '/staff/deliveries/:orderId/status',
    { preHandler: requireStaff },
    async (req) => {
      const { orderId } = z.object({ orderId: UuidSchema }).parse(req.params);
      const b = DeliveryStatusBody.parse(req.body);
      return updateDeliveryStatus(orderId, b.status, b.note, b.handover_code);
    }
  );

  // Staff update delivery rider live location
  app.post(
    '/staff/deliveries/:orderId/location',
    { preHandler: requireStaff },
    async (req) => {
      const { orderId } = z.object({ orderId: UuidSchema }).parse(req.params);
      const b = DeliveryLocationBody.parse(req.body);
      return updateDeliveryLocation(orderId, b.lat, b.lng, b.rider_name, b.rider_phone);
    }
  );

  // Customer report order issue
  app.post('/orders/:id/issue', async (req) => {
    const { id } = z.object({ id: UuidSchema }).parse(req.params);
    const customerId = await customerOf(req);
    const b = OrderIssueBody.parse(req.body);
    return reportOrderIssue(id, customerId, b.reason, b.note);
  });
}
