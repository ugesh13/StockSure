import { loadConfigOrExit } from '../src/config.ts';
import { closePool } from '../src/db.ts';
import { reindexAll } from '../src/search/reindex.ts';

// Rebuild the search index from Postgres. `npm run reindex -- --recreate` drops the index first (test T9).
loadConfigOrExit(['pg', 'opensearch']);

try {
  const r = await reindexAll({ recreate: process.argv.includes('--recreate') });
  console.log(r);
  if (r.documents !== r.expected || r.errors > 0) {
    console.error('Document count does not match products x branches. Check the errors above.');
    process.exitCode = 1;
  }
} finally {
  await closePool();
}
