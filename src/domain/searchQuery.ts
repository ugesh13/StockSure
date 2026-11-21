// OpenSearch query builder (pure). Typo tolerant text query + the three filters from the brief:
// category, price range, city. Results are collapsed by product so a shopper sees each product once.

export type SearchParams = {
  q: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  size: number;
};

export function buildSearchBody(p: SearchParams): Record<string, unknown> {
  const filter: unknown[] = [];
  if (p.category) filter.push({ term: { category: p.category } });
  if (p.minPrice !== undefined || p.maxPrice !== undefined) {
    filter.push({
      range: {
        price_paise: {
          ...(p.minPrice !== undefined ? { gte: p.minPrice } : {}),
          ...(p.maxPrice !== undefined ? { lte: p.maxPrice } : {}),
        },
      },
    });
  }
  if (p.city) filter.push({ term: { city: p.city } });

  const text = p.q.trim();
  const must = text
    ? [{ multi_match: { query: text, fields: ['name^3', 'brand^2', 'tags'], fuzziness: 'AUTO', prefix_length: 1 } }]
    : [{ match_all: {} }];

  return {
    size: p.size,
    query: { bool: { must, filter } },
    collapse: {
      field: 'product_id',
      inner_hits: { name: 'branches', size: 3, sort: [{ available: 'desc' }] },
    },
    aggs: { distinct_products: { cardinality: { field: 'product_id' } } },
  };
}
