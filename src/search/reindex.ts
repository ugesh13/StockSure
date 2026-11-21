import { cfg } from '../config.ts';
import { getPool } from '../db.ts';
import { buildDoc } from '../domain/doc.ts';
import type { DocSource } from '../domain/doc.ts';
import { log } from '../log.ts';
import { REINDEX_ROWS_SQL } from '../sql.ts';
import { bulkIndex, countDocs, deleteIndex, ensureIndex, refreshIndex } from './opensearch.ts';

/**
 * Rebuild the whole search index from Postgres (the source of truth): every product x branch.
 * Safe to run any time. Documents that are already newer in the index are left alone (external versioning).
 * recreate=true drops the index first (for a clean rebuild or after changing the mapping).
 */
export async function reindexAll(opts: { recreate?: boolean } = {}): Promise<{ expected: number; indexed: number; skipped: number; errors: number; documents: number }> {
  if (opts.recreate) await deleteIndex();
  await ensureIndex();

  const { rows } = await getPool().query<DocSource>(REINDEX_ROWS_SQL);
  const now = new Date().toISOString();
  const docs = rows.map((r) => buildDoc(r, cfg().LOW_STOCK, now));
  const result = await bulkIndex(docs);
  await refreshIndex();
  const documents = await countDocs();
  log('info', 'reindex finished', { expected: docs.length, ...result, documents });
  return { expected: docs.length, ...result, documents };
}
