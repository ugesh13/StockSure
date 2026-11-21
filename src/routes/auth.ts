import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  registerCustomer,
  loginCustomer,
  logoutCustomer,
  getCustomerMe,
  forgotPassword,
  resetPassword,
} from '../services/auth.ts';
import {
  buildGoogleAuthUrl,
  handleGoogleCallback,
  exchangeLoginCode,
} from '../services/googleAuth.ts';
import { customerOf } from './common.ts';
import { badInput } from '../errors.ts';

const RegisterBody = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  password: z.string().min(8).max(128),
  phone: z.string().max(20).optional(),
});

const LoginBody = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(128),
});

const ForgotBody = z.object({
  email: z.string().email().max(200),
});

const ResetBody = z.object({
  token: z.string().min(32).max(128),
  new_password: z.string().min(8).max(128),
});

const GoogleExchangeBody = z.object({
  code: z.string().min(1).max(256),
});

function getBearerOrHeaderToken(req: FastifyRequest): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const sessionToken = req.headers['x-session-token'];
  if (typeof sessionToken === 'string' && sessionToken.trim()) {
    return sessionToken.trim();
  }
  return undefined;
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  const LIMIT = (max: number) => ({ config: { rateLimit: { max, timeWindow: '1 minute' } } });

  // POST /auth/register
  app.post(
    '/auth/register',
    {
      ...LIMIT(30),
      schema: {
        tags: ['Authentication'],
        summary: 'Register new customer account or upgrade guest session',
        body: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8, maxLength: 128 },
            phone: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              customer_id: { type: 'integer' },
              token: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const body = RegisterBody.parse(req.body);
      const guestToken = getBearerOrHeaderToken(req);
      const res = await registerCustomer(body, guestToken);
      return reply.status(201).send(res);
    },
  );

  // POST /auth/login
  app.post(
    '/auth/login',
    {
      ...LIMIT(30),
      schema: {
        tags: ['Authentication'],
        summary: 'Log in with email and password',
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              customer_id: { type: 'integer' },
              token: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const body = LoginBody.parse(req.body);
      const guestToken = getBearerOrHeaderToken(req);
      const clientIp = req.ip || '';
      const res = await loginCustomer(body, guestToken, clientIp);
      return reply.status(200).send(res);
    },
  );

  // POST /auth/logout
  app.post(
    '/auth/logout',
    {
      ...LIMIT(60),
      schema: {
        tags: ['Authentication'],
        summary: 'Log out and revoke session token',
        response: {
          204: { type: 'null' },
        },
      },
    },
    async (req, reply) => {
      const token = getBearerOrHeaderToken(req);
      if (token) {
        await logoutCustomer(token);
      }
      return reply.status(204).send();
    },
  );

  // GET /me
  app.get(
    '/me',
    {
      ...LIMIT(120),
      schema: {
        tags: ['Authentication'],
        summary: 'Get current customer profile',
        response: {
          200: {
            type: 'object',
            properties: {
              customer_id: { type: 'integer' },
              name: { type: 'string' },
              email: { type: 'string', nullable: true },
              phone: { type: 'string', nullable: true },
              is_guest: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const customerId = await customerOf(req);
      const me = await getCustomerMe(customerId);
      return reply.status(200).send(me);
    },
  );

  // POST /auth/password/forgot
  app.post(
    '/auth/password/forgot',
    {
      ...LIMIT(10),
      schema: {
        tags: ['Authentication'],
        summary: 'Request password reset link',
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' },
          },
        },
        response: {
          202: {
            type: 'object',
            properties: {
              ok: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const body = ForgotBody.parse(req.body);
      await forgotPassword(body.email);
      return reply.status(202).send({ ok: true });
    },
  );

  // POST /auth/password/reset
  app.post(
    '/auth/password/reset',
    {
      ...LIMIT(10),
      schema: {
        tags: ['Authentication'],
        summary: 'Reset password with token',
        body: {
          type: 'object',
          required: ['token', 'new_password'],
          properties: {
            token: { type: 'string' },
            new_password: { type: 'string', minLength: 8, maxLength: 128 },
          },
        },
        response: {
          204: { type: 'null' },
        },
      },
    },
    async (req, reply) => {
      const body = ResetBody.parse(req.body);
      await resetPassword(body.token, body.new_password);
      return reply.status(204).send();
    },
  );

  // GET /auth/google
  app.get(
    '/auth/google',
    {
      ...LIMIT(30),
      schema: {
        tags: ['Authentication'],
        summary: 'Initiate Google OAuth 2.0 PKCE sign-in flow',
        response: {
          302: {
            type: 'null',
            description: 'Redirect to Google authorization endpoint',
          },
        },
      },
    },
    async (_req, reply) => {
      const authUrl = await buildGoogleAuthUrl();
      return reply.redirect(authUrl, 302);
    },
  );

  // GET /auth/google/callback
  app.get(
    '/auth/google/callback',
    {
      ...LIMIT(30),
      schema: {
        tags: ['Authentication'],
        summary: 'Google OAuth 2.0 redirect callback',
        querystring: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            state: { type: 'string' },
            error: { type: 'string' },
          },
        },
        response: {
          302: {
            type: 'null',
            description: 'Redirect to frontend callback or login error',
          },
        },
      },
    },
    async (req, reply) => {
      const query = req.query as { code?: string; state?: string; error?: string };
      const res = await handleGoogleCallback(query);
      return reply.redirect(res.redirectUrl, 302);
    },
  );

  // POST /auth/google/exchange
  app.post(
    '/auth/google/exchange',
    {
      ...LIMIT(30),
      schema: {
        tags: ['Authentication'],
        summary: 'Exchange one-time Google login code for customer session',
        body: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              customer_id: { type: 'integer' },
              token: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string', nullable: true },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const body = GoogleExchangeBody.parse(req.body);
      const guestToken = getBearerOrHeaderToken(req);
      const res = await exchangeLoginCode(body.code, guestToken);
      return reply.status(200).send(res);
    },
  );
};
