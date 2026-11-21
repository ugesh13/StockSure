// Generated store layout plan and shelf configuration
// Date: 2026-11-20

/**
 * Generated store plan. NOTHING here is hard-coded to a number of products or slots:
 * the aisle length (in bays) follows the catalogue. Bay 1.2 m, shelf depth 0.55 m per side,
 * 4 levels at 0.30 / 0.80 / 1.30 / 1.75 m. Ten aisles in two columns of five rows (A to E left, F to J right).
 */
import { DEPARTMENTS } from './departments.ts';
import { modeOf, packKind, preferredLevel, slotWidth, subFamily, type PackKind, type PackRow } from './packs.ts';

export const BAY_W = 1.2;
export const SHELF_DEPTH = 0.55; // per side
export const LEVEL_HEIGHTS = [0.3, 0.8, 1.3, 1.75];
export const UNIT_DEPTH = SHELF_DEPTH * 2;
export const ROW_PITCH = 4.4; // 1.1 m unit + 3.3 m clear walking width
export const CROSS_AISLE = 4.5;
export const END_FREE = 2;

export interface Placement {
  productId: number;
  level: number; // 1 = bottom
  slot: 1 | 2; // 1 faces the entrance (+z), 2 faces the back wall
  x0: number; // left edge, metres from the start of the unit
  w: number; // slot width
  mode: 'single' | 'stock';
  kind: PackKind;
}
export interface AisleGeo {
  code: string;
  label: string;
  category: string;
  z: number;
  x1: number;
  x2: number;
  bays: number;
  placements: Placement[];
}
export interface GeneratedStore {
  width_m: number;
  depth_m: number;
  entrance: { x: number; z: number };
  kiosk: { x: number; z: number };
  staff_desk: { x: number; z: number };
  aisles: AisleGeo[];
}

const sideOrder = [1, 2] as const;

/** Place products into the 8 rows (4 levels x 2 sides) of a unit that is `bays` long; null if they do not fit. */
export function tryPlace(rows: PackRow[], bays: number): Placement[] | null {
  const cap = bays * BAY_W;
  const used = new Map<string, number>();
  const out: Placement[] = [];
  const sorted = [...rows].sort((a, b) => subFamily(a).localeCompare(subFamily(b)) || a.price_paise - b.price_paise || a.id - b.id);
  for (const r of sorted) {
    const kind = packKind(r);
    const w = slotWidth(r);
    const pref = preferredLevel(r);
    const levels = kind === 'tvpanel' ? [1] : pref >= 3 ? [pref, pref === 3 ? 4 : 3, 2, 1] : [pref, pref + 1, pref + 2, pref + 3].filter((l) => l <= 4);
    let placed = false;
    for (const level of kind === 'tvpanel' ? [1] : levels) {
      // TV aisle keeps level 2 empty (panels are tall), small items there go up
      if (r.category === 'tv' && kind !== 'tvpanel' && level < 3) continue;
      for (const slot of sideOrder) {
        const key = `${level}-${slot}`;
        const u = used.get(key) ?? 0;
        if (u + w <= cap + 1e-6) {
          out.push({ productId: r.id, level, slot, x0: u, w, mode: modeOf(r.category), kind });
          used.set(key, u + w);
          placed = true;
          break;
        }
      }
      if (placed) break;
    }
    if (!placed) return null;
  }
  return out;
}

export function planAisle(rows: PackRow[]): { bays: number; placements: Placement[] } {
  if (!rows.length) return { bays: 2, placements: [] };
  for (let bays = 2; bays < 80; bays++) {
    const p = tryPlace(rows, bays);
    if (p) return { bays, placements: p };
  }
  return { bays: 80, placements: tryPlace(rows, 80) ?? [] };
}

/** The whole store from a product list: aisle lengths from product counts, plate size from the aisles. */
export function generateStore(products: PackRow[]): GeneratedStore {
  const plans = DEPARTMENTS.map((d) => ({ d, ...planAisle(products.filter((p) => p.category === d.category)) }));
  const leftLen = Math.max(...plans.slice(0, 5).map((p) => p.bays * BAY_W));
  const leftX1 = 3.5 + END_FREE;
  const rightX1 = leftX1 + leftLen + CROSS_AISLE;
  const aisles: AisleGeo[] = plans.map((p, i) => {
    const row = i % 5;
    const x1 = i < 5 ? leftX1 : rightX1;
    return {
      code: p.d.code, label: p.d.label, category: p.d.category, z: Number((4 + row * ROW_PITCH).toFixed(2)),
      x1, x2: x1 + p.bays * BAY_W, bays: p.bays, placements: p.placements,
    };
  });
  const rightLen = Math.max(...plans.slice(5).map((p) => p.bays * BAY_W));
  const width = Math.ceil(rightX1 + rightLen + END_FREE + 3.5);
  const lastZ = 4 + 4 * ROW_PITCH;
  const kioskZ = Math.ceil(lastZ + SHELF_DEPTH + 4.6);
  const depth = kioskZ + 9;
  return {
    width_m: width,
    depth_m: depth,
    entrance: { x: Math.round(width / 2), z: depth },
    kiosk: { x: Math.max(14, width - 10), z: kioskZ },
    staff_desk: { x: 7, z: kioskZ },
    aisles,
  };
}

/** World position of a placement's centre: { x, y, z } where z is the front face of the unit side. */
export function placementPos(a: AisleGeo, p: Placement) {
  const x = a.x1 + p.x0 + p.w / 2;
  const sign = p.slot === 1 ? 1 : -1;
  return { x, y: LEVEL_HEIGHTS[p.level - 1], z: a.z + sign * SHELF_DEPTH, bay: Math.min(a.bays, Math.floor((x - a.x1) / BAY_W) + 1) };
}

/** "Aisle B · Bay 4 · Level 2" (the floor part is added only when floors are enabled). */
export function addressText(aisle: string, bay: number, level: number, floorLabel?: string): string {
  return `${floorLabel ? `${floorLabel} · ` : ''}Aisle ${aisle} · Bay ${bay} · Level ${level}`;
}

