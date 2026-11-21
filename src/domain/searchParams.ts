import { z } from 'zod';

const price = z.coerce.number().int().min(0).optional();

/**
 * GET /search query string. Price filters are accepted as min_price / max_price (the API's snake_case style, used in
 * the README) and as minPrice / maxPrice. Values are in paise. If both spellings are sent, camelCase wins.
 */
export const SearchQuery = z
  .object({
    q: z.string().max(100).default(''),
    category: z.string().max(40).optional(),
    city: z.string().max(60).optional(),
    size: z.coerce.number().int().min(1).max(50).default(20),
    min_price: price,
    max_price: price,
    minPrice: price,
    maxPrice: price,
  })
  .transform(({ min_price, max_price, minPrice, maxPrice, ...rest }) => ({
    ...rest,
    minPrice: minPrice ?? min_price,
    maxPrice: maxPrice ?? max_price,
  }))
  .refine((v) => v.minPrice === undefined || v.maxPrice === undefined || v.minPrice <= v.maxPrice, {
    message: 'min_price must be <= max_price',
    path: ['min_price'],
  });
