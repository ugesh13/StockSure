import { cfg } from '../config.ts';
import { docVersion } from '../domain/doc.ts';
import type { SearchDoc } from '../domain/doc.ts';
import { chunk } from '../util.ts';

// Small OpenSearch client on top of fetch. No extra dependency.
// OPENSEARCH_URL carries the login (https://user:pass@host:port); it is turned into a Basic auth header.

type Target = { base: string; auth: string };
let target: Target | undefined;

function getTarget(): Target {
  if (target) return target;
  const u = new URL(cfg().OPENSEARCH_URL);
  const auth = 'Basic ' + Buffer.from(`${decodeURIComponent(u.username)}:${decodeURIComponent(u.password)}`).toString('base64');
  u.username = '';
  u.password = '';
  target = { base: u.toString().replace(/\/$/, ''), auth };
  return target;
}

export class OsError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = 'OsError';
    this.status = status;
    this.body = body;
  }
}

type ReqOpts = { body?: unknown; ndjson?: string; timeoutMs?: number; okStatuses?: number[] };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function osRequest(method: string, path: string, opts: ReqOpts = {}): Promise<{ status: number; json: any }> {
  const t = getTarget();
  const res = await fetch(t.base + path, {
    method,
    headers: { authorization: t.auth, 'content-type': opts.ndjson !== undefined ? 'application/x-ndjson' : 'application/json' },
    body: opts.ndjson ?? (opts.body === undefined ? undefined : JSON.stringify(opts.body)),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 5000),
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  if (!res.ok && !(opts.okStatuses ?? []).includes(res.status)) {
    throw new OsError(res.status, `OpenSearch ${method} ${path.split('?')[0]} -> ${res.status}`, json);
  }
  return { status: res.status, json };
}

const index = (): string => cfg().OPENSEARCH_INDEX;

export const INDEX_DEFINITION = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0, // single node on the free plan
    analysis: {
      filter: {
        syn: {
          type: 'synonym',
          synonyms: ['earphones, earbuds, headphones', 'mobile, phone, smartphone', 'laptop, notebook', 'tv, television'],
        },
      },
      analyzer: { name_an: { tokenizer: 'standard', filter: ['lowercase', 'syn'] } },
    },
  },
  mappings: {
    properties: {
      product_id: { type: 'integer' },
      sku: { type: 'keyword' },
      name: { type: 'text', analyzer: 'name_an' },
      brand: { type: 'text' },
      tags: { type: 'text', analyzer: 'name_an' },
      category: { type: 'keyword' },
      price_paise: { type: 'long' },
      image_url: { type: 'keyword', index: false },
      city: { type: 'keyword' },
      branch_id: { type: 'integer' },
      branch_name: { type: 'keyword' },
      available: { type: 'integer' },
      status: { type: 'keyword' },
      rev: { type: 'long' },
      updated_at: { type: 'date' },
    },
  },
} as const;

/** Create the index if it does not exist yet. Returns true when it was created. */
export async function ensureIndex(): Promise<boolean> {
  const head = await osRequest('GET', `/${index()}`, { okStatuses: [404] });
  if (head.status !== 404) return false;
  await osRequest('PUT', `/${index()}`, { body: INDEX_DEFINITION, timeoutMs: 15_000 });
  return true;
}

export async function deleteIndex(): Promise<void> {
  await osRequest('DELETE', `/${index()}`, { okStatuses: [404], timeoutMs: 15_000 });
}

/** Write one document with external versioning. Old or duplicate events are rejected (409) and reported as skipped. */
export async function indexDoc(doc: SearchDoc): Promise<'indexed' | 'skipped'> {
  const id = encodeURIComponent(`${doc.product_id}:${doc.branch_id}`);
  const r = await osRequest('PUT', `/${index()}/_doc/${id}?version=${docVersion(doc.rev)}&version_type=external`, {
    body: doc,
    okStatuses: [409],
  });
  return r.status === 409 ? 'skipped' : 'indexed';
}

export async function bulkIndex(docs: SearchDoc[]): Promise<{ indexed: number; skipped: number; errors: number }> {
  let indexed = 0;
  let skipped = 0;
  let errors = 0;
  for (const part of chunk(docs, 500)) {
    const lines: string[] = [];
    for (const d of part) {
      lines.push(JSON.stringify({ index: { _index: index(), _id: `${d.product_id}:${d.branch_id}`, version: docVersion(d.rev), version_type: 'external' } }));
      lines.push(JSON.stringify(d));
    }
    const r = await osRequest('POST', '/_bulk', { ndjson: lines.join('\n') + '\n', timeoutMs: 30_000 });
    for (const item of r.json.items ?? []) {
      const s: number = item.index?.status ?? 500;
      if (s === 409) skipped++;
      else if (s >= 200 && s < 300) indexed++;
      else errors++;
    }
  }
  return { indexed, skipped, errors };
}

export async function osSearch(body: unknown, timeoutMs: number) {
  const r = await osRequest('POST', `/${index()}/_search`, { body, timeoutMs });
  return r.json;
}

export async function getDoc(productId: number, branchId: number): Promise<SearchDoc | null> {
  const r = await osRequest('GET', `/${index()}/_doc/${encodeURIComponent(`${productId}:${branchId}`)}`, { okStatuses: [404] });
  return r.status === 404 ? null : (r.json._source as SearchDoc);
}

export async function countDocs(): Promise<number> {
  const r = await osRequest('GET', `/${index()}/_count`, { okStatuses: [404] });
  return r.status === 404 ? 0 : Number(r.json.count ?? 0);
}

export async function refreshIndex(): Promise<void> {
  await osRequest('POST', `/${index()}/_refresh`, { okStatuses: [404] });
}

export async function pingOpenSearch(): Promise<Record<string, unknown>> {
  const h = await osRequest('GET', '/_cluster/health', { timeoutMs: 4000 });
  const docs = await countDocs();
  return { cluster: h.json.status, index: index(), documents: docs };
}
