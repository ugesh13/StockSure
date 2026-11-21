import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfigOrExit } from '../src/config.ts';
import { closePool, getPool } from '../src/db.ts';

// Applies sql/*.sql in name order, once each. Safe to run again.
loadConfigOrExit(['pg']);

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'sql');
const files = readdirSync(dir).filter((f) => f.endsWith('.sql') && !f.startsWith('rollback')).sort();

const c = await getPool().connect();
try {
  await c.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const done = new Set((await c.query<{ name: string }>('SELECT name FROM schema_migrations')).rows.map((r) => r.name));

  for (const f of files) {
    if (done.has(f)) {
      console.log(`skip   ${f} (already applied)`);
      continue;
    }
    await c.query('BEGIN');
    try {
      await c.query(readFileSync(join(dir, f), 'utf8'));
      await c.query('INSERT INTO schema_migrations (name) VALUES ($1)', [f]);
      await c.query('COMMIT');
      console.log(`apply  ${f}`);
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    }
  }
  const mc = await c.query<{ max_connections: string }>('SHOW max_connections');
  console.log(`\nDone. Postgres max_connections = ${mc.rows[0]?.max_connections} (write this number on slide 7).`);
} finally {
  c.release();
  await closePool();
}
