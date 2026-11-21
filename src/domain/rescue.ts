import type { StockLine } from './lines.ts';

// Rescue Ladder planning helpers (pure). The SQL lives in sql.ts, the orchestration in services/rescue.ts.

/** Price window for "equivalent" products: +-15% by default. Integer maths, same as the SQL. */
export function priceWindow(price: number, pct = 15): { min: number; max: number } {
  return { min: Math.floor((price * (100 - pct)) / 100), max: Math.floor((price * (100 + pct)) / 100) };
}

export type BranchStock = { branch_id: number; city: string; product_id: number; available: number };
export type SplitAssignment = { product_id: number; from_branch_id: number; to_branch_id: number; qty: number };

/**
 * Split across branches: for every failed line pick a branch that has the stock,
 * preferring branches already in the plan (fewest shipments), then the shopper's city, then the lowest id.
 * Whole lines only. Returns null when any line cannot be placed anywhere.
 */
export function planSplit(
  failed: readonly StockLine[],
  stock: readonly BranchStock[],
  keepBranches: readonly number[],
  shopperCity: string | null,
): SplitAssignment[] | null {
  const chosen = new Set<number>(keepBranches);
  const out: SplitAssignment[] = [];

  const ordered = [...failed].sort((a, b) => a.product_id - b.product_id || a.branch_id - b.branch_id);
  for (const line of ordered) {
    const candidates = stock
      .filter((s) => s.product_id === line.product_id && s.available >= line.qty && s.branch_id !== line.branch_id)
      .sort((a, b) => {
        const inPlan = Number(chosen.has(b.branch_id)) - Number(chosen.has(a.branch_id));
        if (inPlan !== 0) return inPlan;
        const sameCity = Number(b.city === shopperCity) - Number(a.city === shopperCity);
        if (sameCity !== 0) return sameCity;
        return a.branch_id - b.branch_id;
      });
    const pick = candidates[0];
    if (!pick) return null;
    chosen.add(pick.branch_id);
    out.push({ product_id: line.product_id, from_branch_id: line.branch_id, to_branch_id: pick.branch_id, qty: line.qty });
  }
  return out;
}
