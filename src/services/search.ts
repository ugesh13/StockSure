import { cfg } from '../config.ts';
import { getPool } from '../db.ts';
import { bestStatus } from '../domain/availability.ts';
import type { DisplayStatus } from '../domain/availability.ts';
import { buildSearchBody } from '../domain/searchQuery.ts';
import type { SearchParams } from '../domain/searchQuery.ts';
import { log, errFields } from '../log.ts';
import { osSearch } from '../search/opensearch.ts';
import { FALLBACK_BRANCHES_SQL, FALLBACK_HITS_SQL } from '../sql.ts';
import { branchStatus, getBranchBeats } from './catalog.ts';
import type { BranchBeat } from './catalog.ts';

export type BranchAvailability = { branch_id: number; branch_name: string; city: string; available: number; status: DisplayStatus };

export type SearchResult = {
  product_id: number;
  name: string;
  brand: string;
  category: string;
  price_paise: number;
  image_url: string | null;
  image_credit: string | null;
  image_status: string;
  best_status: DisplayStatus;
  branches: BranchAvailability[];
};

export type SearchResponse = {
  source: 'opensearch' | 'postgres-fallback';
  took_ms: number;
  total: number;
  results: SearchResult[];
};

type OsSource = {
  product_id: number;
  name: string;
  brand: string;
  category: string;
  price_paise: number;
  image_url: string | null;
  image_credit?: string | null;
  image_status?: string | null;
  branch_id: number;
  branch_name: string;
  city: string;
  available: number;
};

function fromOpenSearch(raw: any, beats: Map<number, BranchBeat>): { total: number; results: SearchResult[] } {
  const hits: any[] = raw?.hits?.hits ?? [];
  const results: SearchResult[] = hits.map((h) => {
    const top: OsSource = h._source;
    const inner: any[] = h.inner_hits?.branches?.hits?.hits ?? [];
    const sources: OsSource[] = inner.length > 0 ? inner.map((x) => x._source as OsSource) : [top];
    const branches = sources.map((s) => ({
      branch_id: s.branch_id,
      branch_name: s.branch_name,
      city: s.city,
      available: Math.max(s.available, 0),
      status: branchStatus(s.available, beats.get(s.branch_id)),
    }));
    return {
      product_id: top.product_id,
      name: top.name,
      brand: top.brand,
      category: top.category,
      price_paise: top.price_paise,
      image_url: top.image_url ?? null,
      image_credit: top.image_credit ?? null,
      image_status: top.image_status ?? 'missing',
      best_status: bestStatus(branches.map((b) => b.status)),
      branches,
    };
  });
  return { total: Number(raw?.aggregations?.distinct_products?.value ?? results.length), results };
}

type FallbackHit = { id: number; score: number };
type FallbackBranch = {
  product_id: number;
  name: string;
  brand: string;
  category: string;
  price_paise: number;
  image_url: string | null;
  image_credit?: string | null;
  image_status?: string | null;
  branch_id: number;
  branch_name: string;
  city: string;
  available: number;
};

/** Postgres answer when OpenSearch is down or slow (pg_trgm similarity). Search never shows a blank page. */
async function fromPostgres(p: SearchParams, beats: Map<number, BranchBeat>): Promise<{ total: number; results: SearchResult[] }> {
  const db = getPool();
  const hits = await db.query<FallbackHit>(FALLBACK_HITS_SQL, [p.q.trim(), p.category ?? null, p.minPrice ?? null, p.maxPrice ?? null, p.size]);
  if (hits.rows.length === 0) return { total: 0, results: [] };
  const rows = await db.query<FallbackBranch>(FALLBACK_BRANCHES_SQL, [hits.rows.map((h) => h.id), p.city ?? null]);

  const byProduct = new Map<number, FallbackBranch[]>();
  for (const r of rows.rows) byProduct.set(r.product_id, [...(byProduct.get(r.product_id) ?? []), r]);

  const results: SearchResult[] = [];
  for (const h of hits.rows) {
    const list = byProduct.get(h.id);
    const head = list?.[0];
    if (!list || !head) continue; // no branch in the requested city
    const branches = list
      .sort((a, b) => b.available - a.available)
      .slice(0, 3)
      .map((r) => ({
        branch_id: r.branch_id,
        branch_name: r.branch_name,
        city: r.city,
        available: Math.max(r.available, 0),
        // same rules as the indexer, so both paths give the same badges
        status: branchStatus(r.available, beats.get(r.branch_id)),
      }));
    results.push({
      product_id: head.product_id,
      name: head.name,
      brand: head.brand,
      category: head.category,
      price_paise: head.price_paise,
      image_url: head.image_url,
      image_credit: head.image_credit ?? null,
      image_status: head.image_status ?? 'missing',
      best_status: bestStatus(branches.map((b) => b.status)),
      branches,
    });
  }
  return { total: results.length, results };
}

export async function searchProducts(params: SearchParams): Promise<SearchResponse> {
  const started = Date.now();
  const beats = await getBranchBeats();
  try {
    const raw = await osSearch(buildSearchBody(params), cfg().SEARCH_TIMEOUT_MS);
    return { source: 'opensearch', took_ms: Date.now() - started, ...fromOpenSearch(raw, beats) };
  } catch (e) {
    log('warn', 'opensearch failed, answering from postgres', errFields(e));
    const out = await fromPostgres(params, beats);
    return { source: 'postgres-fallback', took_ms: Date.now() - started, ...out };
  }
}
