import type { ConnectionOptions } from 'node:tls';
import pg from 'pg';
import type { PoolClient } from 'pg';
import { cfg } from './config.ts';
import { log } from './log.ts';
import { sleep } from './util.ts';

// int8 (bigint) -> JS number. Ids, paise and revisions stay far below 2^53.
pg.types.setTypeParser(20, (v: string) => Number(v));

/** Anything with .query(): the pool or a checked-out client. */
export type Db = Pick<pg.Pool, 'query'>;

let pool: pg.Pool | undefined;

function sslOption(): false | ConnectionOptions {
  const c = cfg();
  if (c.PG_SSL === 'off') return false;
  if (c.PG_CA_B64) return { ca: Buffer.from(c.PG_CA_B64, 'base64').toString('utf8'), rejectUnauthorized: true };
  // Encrypted but the certificate is not verified. Set PG_CA_B64 to verify it.
  return { rejectUnauthorized: false };
}

/** One small shared pool per process (never a connection per request). */
export function getPool(): pg.Pool {
  if (pool) return pool;
  const c = cfg();
  // The URI carries sslmode=require; drop it so our explicit ssl option is the single source of truth.
  const url = new URL(c.DATABASE_URL);
  url.searchParams.delete('sslmode');
  pool = new pg.Pool({
    connectionString: url.toString(),
    max: c.PG_POOL_MAX,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 15_000,
    application_name: 'stocksure',
    ssl: sslOption(),
  });
  pool.on('error', (e) => log('error', 'idle pg client error', { error: e.message }));
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    const p = pool;
    pool = undefined;
    await p.end();
  }
}

export async function pingPg(): Promise<Record<string, unknown>> {
  const p = getPool();
  const r = await p.query<{ max_connections: string }>('SHOW max_connections');
  return {
    max_connections: Number(r.rows[0]?.max_connections ?? 0),
    pool: { total: p.totalCount, idle: p.idleCount, waiting: p.waitingCount, max: cfg().PG_POOL_MAX },
  };
}

/** Throw this inside withTx to roll back and hand a result to the caller (for example "not enough stock"). */
export class TxAbort extends Error {
  value: unknown;
  constructor(value: unknown) {
    super('transaction aborted');
    this.name = 'TxAbort';
    this.value = value;
  }
}

function retryable(e: unknown): boolean {
  const code = (e as { code?: string } | null)?.code;
  return code === '40P01' /* deadlock detected */ || code === '40001' /* serialization failure */;
}

/**
 * Run fn in one transaction on one connection. COMMIT on success, ROLLBACK on any error.
 * Deadlocks (40P01) are retried with a small random wait. The whole of fn re-runs, so keep fn free of side effects
 * outside the database.
 */
export async function withTx<T>(fn: (c: PoolClient) => Promise<T>, opts: { attempts?: number } = {}): Promise<T> {
  const attempts = opts.attempts ?? 3;
  for (let attempt = 1; ; attempt++) {
    const client = await getPool().connect();
    let broken = false;
    try {
      await client.query('BEGIN');
      const out = await fn(client);
      await client.query('COMMIT');
      return out;
    } catch (e) {
      try {
        await client.query('ROLLBACK');
      } catch {
        broken = true; // connection is unusable: tell the pool to drop it
      }
      if (retryable(e) && attempt < attempts) {
        await sleep(20 * attempt + Math.floor(Math.random() * 30));
        continue;
      }
      throw e;
    } finally {
      client.release(broken);
    }
  }
}
