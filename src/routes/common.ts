import crypto from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { cfg } from '../config.ts';
import { getPool } from '../db.ts';
import { AppError, badInput } from '../errors.ts';
import type { CheckoutResult } from '../services/orders.ts';
import { describeFailure } from '../services/rescue.ts';
import { safeEqual } from '../util.ts';

function header(req: FastifyRequest, name: string): string | undefined {
  const v = req.headers[name];
  return Array.isArray(v) ? v[0] : v;
}
/** Who is calling. A session token proves a guest; without a token only demo customers 1..20 are allowed when DEMO_MODE=true. */
const DEMO_CUSTOMER_MAX = 20;

export function isDemoMode(): boolean {
  if (process.env.DEMO_MODE === 'false' || process.env.DEMO_MODE === '0') return false;
  if (process.env.DEMO_MODE === 'true' || process.env.DEMO_MODE === '1') return true;
  try {
    return cfg().DEMO_MODE;
  } catch {
    return false;
  }
}

export async function requireDemoOrStaff(req: FastifyRequest): Promise<void> {
  if (isDemoMode()) return;
  const got = header(req, 'x-staff-key');
  if (got && safeEqual(got, cfg().STAFF_KEY)) return;
  throw new AppError(401, 'UNAUTHORIZED', 'Demo routes require DEMO_MODE=true or valid X-Staff-Key');
}

export async function customerOf(req: FastifyRequest): Promise<number> {
  const token = header(req, 'x-session-token');
  const raw = header(req, 'x-customer-id');

  if (token) {
    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const res = await getPool().query<{ customer_id: number; expires_at: Date }>(
      'SELECT customer_id, expires_at FROM sessions WHERE token_hash = $1',
      [tokenHash],
    );
    const session = res.rows[0];
    if (!session || new Date(session.expires_at).getTime() <= Date.now()) {
      throw new AppError(401, 'BAD_SESSION', 'Session is invalid or has expired');
    }
    if (raw !== undefined && Number(raw) !== session.customer_id) {
      throw new AppError(401, 'BAD_SESSION', 'Session token does not match X-Customer-Id');
    }
    void getPool().query('UPDATE sessions SET last_seen_at = now() WHERE token_hash = $1', [tokenHash]).catch(() => { });
    return session.customer_id;
  }

  // Without a session token, only demo customers 1 to 20 are allowed, and ONLY when DEMO_MODE=true and NODE_ENV !== 'production'
  const isProd = process.env.NODE_ENV === 'production' || (cfg().NODE_ENV === 'production');
  if (!isProd && isDemoMode() && raw !== undefined) {
    const n = Number(raw);
    if (Number.isInteger(n) && n >= 1 && n <= DEMO_CUSTOMER_MAX) {
      return n;
    }
  }

  throw new AppError(401, 'SESSION_REQUIRED', 'Valid session token required');
}

const KeySchema = z.string().min(8).max(128).regex(/^[A-Za-z0-9_\-:.]+$/);

/** Checkout needs an Idempotency-Key so a double click or a retry can never create two orders. */
export function idempotencyKeyOf(req: FastifyRequest): string {
  const raw = header(req, 'idempotency-key');
  if (!raw) throw badInput('Idempotency-Key header is required');
  const parsed = KeySchema.safeParse(raw);
  if (!parsed.success) throw badInput('Idempotency-Key must be 8-128 characters: letters, digits, _ - : .');
  return parsed.data;
}

export function shopperCityOf(req: FastifyRequest): string | null {
  const v = header(req, 'x-shopper-city');
  return v && v.length <= 60 ? v : null;
}

function requireKey(name: string, expected: () => string) {
  return async (req: FastifyRequest): Promise<void> => {
    const got = header(req, name);
    if (!got || !safeEqual(got, expected())) throw new AppError(401, 'UNAUTHORIZED', `Missing or wrong ${name}`);
  };
}

export const requireStaff = requireKey('x-staff-key', () => cfg().STAFF_KEY);
export const requireAdmin = requireKey('x-admin-token', () => cfg().ADMIN_TOKEN);

export const IdSchema = z.coerce.number().int().positive();
export const UuidSchema = z.string().uuid();

/** 201/200 with the order, or 409 with the failed lines and the Rescue Ladder. */
export async function respondCheckout(reply: FastifyReply, result: CheckoutResult, shopperCity: string | null): Promise<FastifyReply> {
  if (result.ok) return reply.status(result.replay ? 200 : 201).send({ order: result.order, replay: result.replay });
  const details = await describeFailure(result.failed, result.lines, shopperCity);
  return reply.status(409).send({
    error: { code: 'OUT_OF_STOCK', message: 'Some items are no longer available at the chosen branch.', details },
  });
}
