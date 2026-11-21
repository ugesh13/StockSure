import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { findNearestBranches, getBranchDirections, geocodeAddress } from '../services/maps.ts';

const NearestBranchesQuery = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  limit: z.coerce.number().min(1).max(20).default(5),
  product_id: z.coerce.number().int().positive().optional(),
});

const BranchDirectionsParams = z.object({
  id: z.coerce.number().int().positive(),
});

const BranchDirectionsQuery = z.object({
  from_lat: z.coerce.number().min(-90).max(90),
  from_lng: z.coerce.number().min(-180).max(180),
  mode: z.enum(['driving', 'walking']).default('driving'),
});

const GeocodeBody = z.object({
  address: z.string().min(1).max(500),
});

export async function mapsRoutes(app: FastifyInstance): Promise<void> {
  // 1. Nearest branches
  app.get('/branches/nearest', async (req: FastifyRequest, reply: FastifyReply) => {
    const query = NearestBranchesQuery.parse(req.query);
    const branches = await findNearestBranches(query.lat, query.lng, query.limit, query.product_id);
    return reply.status(200).send({ branches });
  });

  // 2. Branch directions & ETA
  app.get('/branches/:id/directions', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = BranchDirectionsParams.parse(req.params);
    const query = BranchDirectionsQuery.parse(req.query);
    const directions = await getBranchDirections(id, query.from_lat, query.from_lng, query.mode);
    return reply.status(200).send(directions);
  });

  // 3. Geocode address to lat/lng
  app.post('/geo/geocode', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = GeocodeBody.parse(req.body);
    const geocoded = await geocodeAddress(body.address);
    return reply.status(200).send(geocoded);
  });
}
