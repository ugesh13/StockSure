import { cfg } from '../config.ts';
import { getPool } from '../db.ts';
import { buildDoc } from '../domain/doc.ts';
import type { DocSource } from '../domain/doc.ts';
import type { AppEvent } from '../events.ts';
import { indexDoc } from '../search/opensearch.ts';
import { DOC_SOURCE_SQL } from '../sql.ts';

export const INDEXER_GROUP = 'search-indexer';

type StaticDoc = Omit<DocSource, 'on_hand' | 'reserved' | 'buffer' | 'rev'>;

/**
 * inventory.changed -> rebuild the one search document for that product at that branch.
 * Written with version_type=external and version=rev+1, so an old or out-of-order event is rejected by OpenSearch
 * itself. That makes this consumer duplicate-safe without a processed_events row.
 */
export async function handleIndexer(event: AppEvent): Promise<void> {
  if (event.type !== 'inventory.changed') return;
  const d = event.data;

  const r = await getPool().query<StaticDoc>(DOC_SOURCE_SQL, [d.product_id, d.branch_id]);
  const base = r.rows[0];
  if (!base) throw new Error(`product ${d.product_id} or branch ${d.branch_id} not found`);

  const doc = buildDoc({ ...base, on_hand: d.on_hand, reserved: d.reserved, buffer: d.buffer, rev: d.rev }, cfg().LOW_STOCK, event.occurred_at);
  await indexDoc(doc);
}
