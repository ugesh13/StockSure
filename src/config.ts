import { z } from 'zod';

// Every secret is an environment variable. The process refuses to start when something required is missing.
// Only the NAMES of problems are printed, never values.

export type Group = 'pg' | 'kafka' | 'opensearch' | 'api';

const REQUIRED: Record<Group, string[]> = {
  pg: ['DATABASE_URL'],
  kafka: ['KAFKA_BROKERS', 'KAFKA_CA_B64'],
  opensearch: ['OPENSEARCH_URL'],
  api: ['STAFF_KEY', 'ADMIN_TOKEN'],
};

const int = (def: number, min: number, max: number) => z.coerce.number().int().min(min).max(max).default(def);
const flag = (def: boolean) =>
  z
    .union([z.boolean(), z.enum(['true', 'false', '1', '0', ''])])
    .default(def ? 'true' : 'false')
    .transform((v) => v === true || v === 'true' || v === '1');
const str = () => z.string().default('');

const Schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: int(3000, 1, 65535),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  DATABASE_URL: str(),
  PG_SSL: z.enum(['require', 'off']).default('require'),
  PG_CA_B64: str(),
  PG_POOL_MAX: int(6, 1, 15),

  KAFKA_BROKERS: str(),
  KAFKA_CA_B64: str(),
  KAFKA_CERT_B64: str(),
  KAFKA_KEY_B64: str(),
  KAFKA_SASL_USERNAME: str(),
  KAFKA_SASL_PASSWORD: str(),
  KAFKA_SASL_MECHANISM: z.enum(['scram-sha-256', 'scram-sha-512', 'plain']).default('scram-sha-256'),
  KAFKA_PARTITIONS: int(2, 1, 12),
  KAFKA_CLIENT_ID: z.string().default('stocksure'),

  OPENSEARCH_URL: str(),
  OPENSEARCH_INDEX: z.string().default('products_v1'),

  STAFF_KEY: str(),
  ADMIN_TOKEN: str(),

  HOLD_MINUTES: int(10, 1, 120),
  LOW_STOCK: int(3, 1, 100),
  STALE_SECONDS: int(60, 5, 3600),
  RELAY_INTERVAL_MS: int(400, 50, 10_000),
  SWEEP_INTERVAL_MS: int(30_000, 1000, 600_000),
  SEARCH_TIMEOUT_MS: int(1500, 200, 10_000),
  RUN_RELAY: flag(true),
  RUN_SWEEPER: flag(true),
  DEMO_MODE: flag(false),
  DOCS_ENABLED: flag(false),
  ALLOW_DESTRUCTIVE: flag(false),

  ZOHO_CLIENT_ID: str(),
  ZOHO_CLIENT_SECRET: str(),
  ZOHO_REFRESH_TOKEN: str(),
  ZOHO_ORG_ID: str(),
  ZOHO_ACCOUNTS_URL: z.string().default('https://accounts.zoho.in'),
  ZOHO_API_URL: z.string().default('https://www.zohoapis.in/inventory/v1'),

  PAYMENT_PROVIDER: z.enum(['mock', 'razorpay']).default('mock'),
  RAZORPAY_KEY_ID: str(),
  RAZORPAY_KEY_SECRET: str(),
  RAZORPAY_WEBHOOK_SECRET: str(),
  PAYMENT_TTL_MINUTES: int(15, 1, 120),

  GOOGLE_MAPS_SERVER_KEY: str(),

  GOOGLE_CLIENT_ID: str(),
  GOOGLE_CLIENT_SECRET: str(),
  GOOGLE_CALLBACK_URL: str(),
  FRONTEND_URL: z.string().default('http://localhost:5173'),

  DELIVERY_MAX_KM: int(15, 1, 100),
  DELIVERY_BASE_FEE: int(40, 0, 1000),
  DELIVERY_PER_KM: int(8, 0, 100),
  FREE_DELIVERY_ABOVE: int(999, 0, 10000),

  CHAT_LLM_PROVIDER: z.enum(['none', 'gemini']).default('none'),
});

export type Config = z.infer<typeof Schema>;

export class ConfigError extends Error {
  problems: string[];
  constructor(problems: string[]) {
    super(`Invalid configuration:\n - ${problems.join('\n - ')}`);
    this.name = 'ConfigError';
    this.problems = problems;
  }
}

let current: Config | undefined;

/** Read, validate and remember the configuration. `defaults` apply only when the variable is not set. */
export function loadConfig(groups: Group[], defaults: Record<string, string> = {}): Config {
  const env: Record<string, string> = { ...defaults };
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined && v !== '') env[k] = v;
  }
  if (process.env.STAFF_API_KEY && !env.STAFF_KEY) {
    env.STAFF_KEY = process.env.STAFF_API_KEY;
  }
  if (process.env.CORS_ORIGIN && !process.env.CORS_ORIGINS) {
    console.warn('[WARN] CORS_ORIGIN is deprecated. Use CORS_ORIGINS instead.');
    env.CORS_ORIGINS = process.env.CORS_ORIGIN;
  }

  const parsed = Schema.safeParse(env);
  if (!parsed.success) {
    throw new ConfigError(parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`));
  }
  const c = parsed.data;
  const problems: string[] = [];

  for (const g of groups) {
    for (const name of REQUIRED[g]) {
      if (!(c as Record<string, unknown>)[name]) problems.push(`${name} is required`);
    }
  }
  if (groups.includes('kafka')) {
    const cert = Boolean(c.KAFKA_CERT_B64 && c.KAFKA_KEY_B64);
    const sasl = Boolean(c.KAFKA_SASL_USERNAME && c.KAFKA_SASL_PASSWORD);
    if (!cert && !sasl) {
      problems.push('Kafka auth missing: set KAFKA_CERT_B64 + KAFKA_KEY_B64 (certificate) or KAFKA_SASL_USERNAME + KAFKA_SASL_PASSWORD (SASL)');
    }
  }
  if (groups.includes('api')) {
    for (const name of ['STAFF_KEY', 'ADMIN_TOKEN'] as const) {
      if (c[name] && c[name].length < 8) problems.push(`${name} must be at least 8 characters`);
    }
  }

  // Google OAuth validation: enabled only if all 3 are set. If partially set, fail naming missing variable.
  const googleVars = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CALLBACK_URL'] as const;
  const googleSet = googleVars.filter((v) => Boolean(c[v]));
  if (googleSet.length > 0 && googleSet.length < googleVars.length) {
    const missing = googleVars.filter((v) => !c[v]);
    for (const m of missing) {
      problems.push(`${m} is required`);
    }
  }

  // FRONTEND_URL must be listed in CORS_ORIGINS to prevent open redirects
  if (c.FRONTEND_URL) {
    const origins = c.CORS_ORIGINS.split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
    const frontend = c.FRONTEND_URL.trim().replace(/\/$/, '');
    if (!origins.includes(frontend)) {
      problems.push('FRONTEND_URL must be one of CORS_ORIGINS');
    }
  }
  if (problems.length > 0) throw new ConfigError(problems);

  current = c;
  return c;
}

/** Same as loadConfig but prints the problems and exits. Use at the top of every entry point. */
export function loadConfigOrExit(groups: Group[], defaults: Record<string, string> = {}): Config {
  try {
    return loadConfig(groups, defaults);
  } catch (e) {
    if (e instanceof ConfigError) {
      console.error(e.message);
      console.error('\nCopy .env.example to .env and fill it in (see README).');
      process.exit(1);
    }
    throw e;
  }
}

export function cfg(): Config {
  if (!current) throw new Error('Configuration not loaded. Call loadConfig() first.');
  return current;
}
