// Display models for nursery stock: potted plants (4/6/8-inch) and saplings (1/2/3-ft).

/** Pack models, display scale, colours and shelf-level rules. Pure data: shared by the planner, the 3D scene and the tests. */
export type PackKind = 'pot4' | 'pot6' | 'pot8' | 'sapling1' | 'sapling2' | 'sapling3';

export interface PackRow {
  id: number;
  category: string;
  brand: string;
  name: string;
  price_paise: number;
}

/** `single`: one unit, one tag. `stock`: a group of up to 3 units across, 3 deep. Plants are always shown as stock groups. */
export const SINGLE_DEPTS = new Set<string>();
export const modeOf = (category: string): 'single' | 'stock' => (SINGLE_DEPTS.has(category) ? 'single' : 'stock');

/** Size comes from the variant in the product name, e.g. "Tulsi (Holy Basil), 6-inch pot" or "Mango, 2-ft sapling". */
export function packKind(r: PackRow): PackKind {
  const n = r.name.toLowerCase();
  const ft = /(\d)\s*-?\s*ft/.exec(n);
  if (/sapling/.test(n) || ft) {
    const h = Number(ft?.[1] ?? 2);
    return h >= 3 ? 'sapling3' : h === 2 ? 'sapling2' : 'sapling1';
  }
  const inch = Number(/(\d+)\s*-?\s*inch/.exec(n)?.[1] ?? 6);
  return inch >= 8 ? 'pot8' : inch >= 6 ? 'pot6' : 'pot4';
}

/** [width, height, depth] in metres (pot plus foliage), real size. */
const REAL: Record<PackKind, [number, number, number]> = {
  pot4: [0.11, 0.22, 0.11],
  pot6: [0.16, 0.32, 0.16],
  pot8: [0.21, 0.4, 0.21],
  sapling1: [0.12, 0.3, 0.12],
  sapling2: [0.14, 0.6, 0.14],
  sapling3: [0.16, 0.9, 0.16],
};
export const MAX_PACK_W = 0.45;
export const MAX_PACK_H = 0.44; // clear height between two shelf levels

export interface PackDims {
  w: number;
  h: number;
  d: number;
  round: boolean;
}

/** Display size, clamped to the shelf clearance. Tall saplings stand on the floor level, so they are not clamped. */
export function packDims(kind: PackKind, _r?: PackRow): PackDims {
  const [w, h, d] = REAL[kind];
  if (kind === 'sapling2' || kind === 'sapling3') return { w, h, d, round: true };
  const s = Math.min(1.2, MAX_PACK_H / h, MAX_PACK_W / w);
  return { w: w * s, h: h * s, d: d * s, round: true };
}

/** Width of the shelf slot a product needs, in metres. A stock group is always the width of 3 units so shelves never reflow. */
export function slotWidth(r: PackRow): number {
  const dm = packDims(packKind(r), r);
  return modeOf(r.category) === 'single' ? dm.w + 0.08 : 3 * (dm.w + 0.03) + 0.08;
}

/** Preferred shelf level 1..4 (bottom to top): tall saplings and big pots low, small pots at eye level. */
export function preferredLevel(r: PackRow): number {
  switch (packKind(r)) {
    case 'sapling3':
    case 'sapling2':
    case 'pot8':
      return 1;
    case 'pot6':
    case 'sapling1':
      return 2;
    default:
      return 3;
  }
}

/** Sub-family sort key: keep every size of the same plant together, smallest first. */
export function subFamily(r: PackRow): string {
  return r.name.split(',')[0]!.trim().toLowerCase();
}

const DEPT_COLORS: Record<string, string> = {
  'Indoor foliage': '#2F7D32',
  'Flowering plants': '#D63384',
  'Herbs & medicinal': '#5A9E3A',
  'Fruit plants': '#E67E22',
  'Vegetable seedlings': '#7CB342',
  'Succulents & cacti': '#8D9E4A',
  'Palms & ferns': '#1B5E20',
  'Sacred plants': '#F4A300',
  'Aquatic & orchids': '#7B4FA0',
};
export const brandColor = (_brand: string, category: string): string => DEPT_COLORS[category] ?? '#2F7D32';
