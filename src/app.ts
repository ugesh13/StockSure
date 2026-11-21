import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { cfg } from './config.ts';
import { parseJsonBody } from './domain/json.ts';
import { AppError } from './errors.ts';
import { log, errFields } from './log.ts';
import { registerRoutes } from './routes/index.ts';

type ErrorBody = { status: number; code: string; message: string; details?: unknown };

/** One error format everywhere: { error: { code, message, details } }. Never leaks internals. */
function toErrorBody(err: unknown): ErrorBody {
  if (err instanceof AppError) return { status: err.status, code: err.code, message: err.message, details: err.details };
  if (err instanceof ZodError) {
    return { status: 400, code: 'BAD_INPUT', message: 'Invalid input', details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) };
  }
  const e = err as { statusCode?: number; code?: string; message?: string };
  if (e.statusCode === 429) return { status: 429, code: 'RATE_LIMITED', message: 'Too many requests. Slow down a little.' };
  if (e.statusCode === 400 || e.statusCode === 413 || e.statusCode === 415) return { status: e.statusCode, code: 'BAD_REQUEST', message: 'The request could not be read.' };
  switch (e.code) {
    case '23503':
      return { status: 404, code: 'NOT_FOUND', message: 'A referenced record does not exist.' };
    case '23505':
      return { status: 409, code: 'CONFLICT', message: 'That record already exists.' };
    case '23514':
      return { status: 400, code: 'BAD_INPUT', message: 'A value is outside the allowed range.' };
    case '40P01':
      return { status: 503, code: 'BUSY', message: 'The store is busy. Please try again.' };
    case 'ECONNREFUSED':
    case 'ETIMEDOUT':
    case 'ENOTFOUND':
    case 'ECONNRESET':
    case '57P01':
    case '53300':
      return { status: 503, code: 'DEPENDENCY_DOWN', message: 'A backend service is temporarily unavailable.' };
    default:
      return { status: 500, code: 'INTERNAL', message: 'Something went wrong.' };
  }
}

export async function buildApp(): Promise<FastifyInstance> {
  const c = cfg();
  const app = Fastify({
    logger: {
      level: 'info',
      redact: [
        'req.headers["x-staff-key"]',
        'req.headers["x-admin-token"]',
        'req.headers["x-session-token"]',
        'req.headers.authorization',
      ],
    },
    trustProxy: true, // behind the hosting platform's proxy: real client IP for rate limiting
    bodyLimit: 100_000,
  });

  const configuredOrigins = (process.env.CORS_ORIGINS || c.CORS_ORIGINS || c.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const corsOrigins = [...configuredOrigins];
  if (c.NODE_ENV !== 'production') {
    if (!corsOrigins.includes('http://127.0.0.1:5173')) corsOrigins.push('http://127.0.0.1:5173');
    if (!corsOrigins.includes('http://localhost:5173')) corsOrigins.push('http://localhost:5173');
  }

  await app.register(cors, {
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'content-type',
      'idempotency-key',
      'x-customer-id',
      'x-session-token',
      'x-shopper-city',
      'x-staff-key',
      'x-admin-token',
    ],
  });
  await app.register(rateLimit, { global: false });

  // Allow an empty body with Content-Type: application/json (POST /pay, POST /cancel, DELETE ...). The built-in
  // parser rejects it with 400. Every body still goes through Zod, which builds fresh objects from it.
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    try {
      done(null, parseJsonBody(String(body)));
    } catch (e) {
      done(e as Error, undefined);
    }
  });

  app.setErrorHandler((err, req, reply) => {
    const body = toErrorBody(err);
    if (body.status >= 500) log('error', 'request failed', { method: req.method, url: req.url.split('?')[0], ...errFields(err) });
    return reply.status(body.status).send({ error: { code: body.code, message: body.message, details: body.details ?? [] } });
  });
  app.setNotFoundHandler((_req, reply) => reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'No such route.', details: [] } }));

  const shouldExposeDocs = c.NODE_ENV !== 'production' || c.DOCS_ENABLED;
  if (shouldExposeDocs) {
    await app.register(swagger, {
      openapi: {
        info: {
          title: 'StockSure API',
          description: 'StockSure backend: Fastify API + Kafka worker on Aiven PostgreSQL, Kafka and OpenSearch',
          version: '1.0.0',
        },
        components: {
          securitySchemes: {
            sessionToken: {
              type: 'apiKey',
              name: 'X-Session-Token',
              in: 'header',
              description: 'Guest session token obtained from POST /session (required on shopping routes)',
            },
            customerId: {
              type: 'apiKey',
              name: 'X-Customer-Id',
              in: 'header',
              description: 'Customer ID (demo shoppers 1..20 allowed without session token when DEMO_MODE=true)',
            },
            staffKey: {
              type: 'apiKey',
              name: 'X-Staff-Key',
              in: 'header',
              description: 'Staff secret key from STAFF_KEY env variable for staff operations and demo routes',
            },
            adminToken: {
              type: 'apiKey',
              name: 'X-Admin-Token',
              in: 'header',
              description: 'Admin secret token from ADMIN_TOKEN env variable for admin recovery operations',
            },
          },
        },
        tags: [
          { name: 'Storefront', description: 'Catalog, branches, search, and 3D shelves' },
          { name: 'Cart & Orders', description: 'Cart management, guarded reserve checkout, payments' },
          { name: 'Kiosk & Rescue', description: 'Kiosk cart codes and branch rescue ladder' },
          { name: 'Staff', description: 'Staff live stock adjustments and product creation' },
          { name: 'Demo', description: 'Demo pipeline status, proof inspect, and events (/demo/*, protected unless DEMO_MODE=true)' },
          { name: 'Admin', description: 'DLQ replay, OpenSearch reindexing, Zoho inventory sync' },
        ],
      },
    });

    await app.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
      },
    });
  }

  registerRoutes(app);
  return app;
}
