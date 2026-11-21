export type StockLine = { branch_id: number; product_id: number; qty: number };

/**
 * Sort cart lines by (branch, product). Every checkout locks stock rows in this same order,
 * so two checkouts can never wait on each other in a circle (deadlock).
 */
export function sortLines<T extends { branch_id: number; product_id: number }>(lines: readonly T[]): T[] {
  return [...lines].sort((a, b) => a.branch_id - b.branch_id || a.product_id - b.product_id);
}

/** Sum quantities per product (a cart may hold the same product from two branches). */
export function mergeByProduct(lines: readonly { product_id: number; qty: number }[]): { product_id: number; qty: number }[] {
  const map = new Map<number, number>();
  for (const l of lines) map.set(l.product_id, (map.get(l.product_id) ?? 0) + l.qty);
  return [...map.entries()].map(([product_id, qty]) => ({ product_id, qty })).sort((a, b) => a.product_id - b.product_id);
}
