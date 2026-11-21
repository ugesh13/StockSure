import { spawnSync } from 'node:child_process';
import { loadConfigOrExit } from '../src/config.ts';
import { closePool, getPool } from '../src/db.ts';

if (!process.argv.includes('--yes')) {
  console.error('ERROR: Refusing to reset without --yes flag.');
  console.error('Usage: npm run demo:reset -- --yes');
  process.exit(1);
}

// Authorize destructive seed
process.env.ALLOW_DESTRUCTIVE = '1';

console.log('=== STOCKSURE DEMO RESET STARTING ===\n');

// 1. Run seed --reset
console.log('[1/4] Seeding 12 branches, 235 products, deterministic inventory, and initial OpenSearch docs...');
const seedRes = spawnSync(process.execPath, ['--env-file-if-exists=.env', 'scripts/seed.ts', '--reset'], {
  stdio: 'inherit',
  env: { ...process.env, ALLOW_DESTRUCTIVE: '1' },
});
if (seedRes.status !== 0) {
  console.error('FAIL: seed failed with exit code', seedRes.status);
  process.exit(seedRes.status ?? 1);
}

// 2. Run reindex
console.log('\n[2/4] Reindexing OpenSearch...');
const reindexRes = spawnSync(process.execPath, ['--env-file-if-exists=.env', 'scripts/reindex.ts'], {
  stdio: 'inherit',
});
if (reindexRes.status !== 0) {
  console.error('FAIL: reindex failed with exit code', reindexRes.status);
  process.exit(reindexRes.status ?? 1);
}

// 3. Run warm-up
console.log('\n[3/4] Warming up services (Postgres, Kafka, OpenSearch)...');
const warmupRes = spawnSync(process.execPath, ['--env-file-if-exists=.env', 'scripts/warmup.ts'], {
  stdio: 'inherit',
});
if (warmupRes.status !== 0) {
  console.error('FAIL: warmup failed with exit code', warmupRes.status);
  process.exit(warmupRes.status ?? 1);
}

// 4. Fixture check
console.log('\n[4/4] Verifying stock fixtures in Postgres...');
loadConfigOrExit(['pg']);
const pool = getPool();

try {
  // Product 1: branch 1 = 1 unit, branch 2 = 0, branch 3 = 4
  const p1Res = await pool.query<{ branch_id: number; available: number }>(`
    SELECT branch_id, GREATEST(on_hand - reserved - buffer, 0)::int AS available
      FROM inventory
     WHERE product_id = 1
     ORDER BY branch_id
  `);
  const b1 = p1Res.rows.find((r) => r.branch_id === 1)?.available;
  const b2 = p1Res.rows.find((r) => r.branch_id === 2)?.available;
  const b3 = p1Res.rows.find((r) => r.branch_id === 3)?.available;

  console.log(`Fixture 1: Product 1: branch 1 = ${b1} unit(s), branch 2 = ${b2}, branch 3 = ${b3}`);
  if (b1 !== 1 || b2 !== 0 || b3 !== 4) {
    console.error(`FAIL: Product 1 fixture mismatch! Expected (b1=1, b2=0, b3=4), got (b1=${b1}, b2=${b2}, b3=${b3})`);
    process.exit(1);
  }

  // Product 2: 0 at all 12 branches
  const p2Res = await pool.query<{ sum: number; count: number }>(`
    SELECT COALESCE(SUM(on_hand), 0)::int AS sum, count(*)::int AS count
      FROM inventory
     WHERE product_id = 2
  `);
  console.log(`Fixture 2: Product 2: 0 at all ${p2Res.rows[0]?.count} branches (total on_hand = ${p2Res.rows[0]?.sum})`);
  if (p2Res.rows[0]?.sum !== 0 || p2Res.rows[0]?.count !== 12) {
    console.error(`FAIL: Product 2 fixture mismatch! Expected 0 units across 12 branches, got sum=${p2Res.rows[0]?.sum}, count=${p2Res.rows[0]?.count}`);
    process.exit(1);
  }

  // Product 3: 25 at all 12 branches
  const p3Res = await pool.query<{ min_on_hand: number; max_on_hand: number; count: number }>(`
    SELECT MIN(on_hand)::int AS min_on_hand, MAX(on_hand)::int AS max_on_hand, count(*)::int AS count
      FROM inventory
     WHERE product_id = 3
  `);
  console.log(`Fixture 3: Product 3: 25 at all ${p3Res.rows[0]?.count} branches (min = ${p3Res.rows[0]?.min_on_hand}, max = ${p3Res.rows[0]?.max_on_hand})`);
  if (p3Res.rows[0]?.min_on_hand !== 25 || p3Res.rows[0]?.max_on_hand !== 25 || p3Res.rows[0]?.count !== 12) {
    console.error(`FAIL: Product 3 fixture mismatch! Expected 25 units across 12 branches, got min=${p3Res.rows[0]?.min_on_hand}, max=${p3Res.rows[0]?.max_on_hand}`);
    process.exit(1);
  }

  console.log('\nALL FIXTURES VERIFIED SUCCESSFULLY!');
} finally {
  await closePool();
}

