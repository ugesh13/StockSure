// Availability rules. Pure functions: no database, no network.

export type BaseStatus = 'IN_STOCK' | 'LAST_UNITS' | 'OUT';
export type DisplayStatus = BaseStatus | 'CONFIRM_WITH_STORE';

export type StockNumbers = { on_hand: number; reserved: number; buffer: number };

/** Available = on_hand - reserved - buffer. */
export function availableOf(s: StockNumbers): number {
  return s.on_hand - s.reserved - s.buffer;
}

/** available >= lowStock -> IN_STOCK; 1..lowStock-1 -> LAST_UNITS; 0 or less -> OUT. (Guide: 3 / 1-2 / 0) */
export function stockStatus(available: number, lowStock: number): BaseStatus {
  if (available <= 0) return 'OUT';
  if (available < lowStock) return 'LAST_UNITS';
  return 'IN_STOCK';
}

/** Freshness rule: the branch has not confirmed its stock for more than `staleSeconds`. */
export function isStale(lastBeat: Date | string | number | null | undefined, nowMs: number, staleSeconds: number): boolean {
  if (lastBeat === null || lastBeat === undefined) return true;
  const t = lastBeat instanceof Date ? lastBeat.getTime() : new Date(lastBeat).getTime();
  if (Number.isNaN(t)) return true;
  return nowMs - t > staleSeconds * 1000;
}

/** A stale branch shows "confirm with store" instead of a badge. OUT stays OUT: it can never cause an oversell. */
export function displayStatus(base: BaseStatus, stale: boolean): DisplayStatus {
  if (stale && base !== 'OUT') return 'CONFIRM_WITH_STORE';
  return base;
}

const RANK: Record<DisplayStatus, number> = { IN_STOCK: 3, LAST_UNITS: 2, CONFIRM_WITH_STORE: 1, OUT: 0 };

/** The best status across several branches (used for the product-level badge). */
export function bestStatus(statuses: readonly DisplayStatus[]): DisplayStatus {
  let best: DisplayStatus = 'OUT';
  for (const s of statuses) if (RANK[s] > RANK[best]) best = s;
  return best;
}
