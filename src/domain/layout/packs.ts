// Copied verbatim from C:\Users\ugesh\Desktop\College\Hackathon\Avishkar\MemGuard-AI-Foundation\stocksure-frontend\src\data\packs.ts
// Date: 2026-11-20

/** Pack models, display scale, brand colours and shelf-level rules. Pure data: shared by the planner, the 3D scene and the tests. */
export type PackKind =
  | 'phonebox' | 'tabletbox' | 'earbudbox' | 'headphonebox' | 'speakerbox' | 'laptopbox' | 'smallbox' | 'tvpanel' | 'cartonL'
  | 'watchbox' | 'blister' | 'tubebox' | 'brushbox' | 'soapbox' | 'bottle' | 'jar' | 'pouch' | 'carton' | 'can';

export interface PackRow {
  id: number;
  category: string;
  brand: string;
  name: string;
  price_paise: number;
}

/** `single`: one unit, one tag, stock number in the tag chip. `stock`: group of up to 3 units across, 3 deep, following stock. */
export const SINGLE_DEPTS = new Set(['audio', 'mobiles', 'computing', 'tv', 'appliances', 'wearables', 'accessories']);
export const modeOf = (category: string): 'single' | 'stock' => (SINGLE_DEPTS.has(category) ? 'single' : 'stock');

export function packKind(r: PackRow): PackKind {
  const n = r.name.toLowerCase();
  switch (r.category) {
    case 'audio':
      if (/headphone/.test(n)) return 'headphonebox';
      if (/speaker|soundbar|bar /.test(n)) return 'speakerbox';
      return 'earbudbox';
    case 'mobiles':
      return /ipad|tab\b|tablet/.test(n) ? 'tabletbox' : 'phonebox';
    case 'computing':
      if (/laptop|ideapad|vivobook|aspire|macbook|inspiron|thinkbook|omnibook|xps|hp 15s|probook/.test(n)) return 'laptopbox';
      if (/monitor|printer/.test(n)) return 'cartonL';
      return 'smallbox';
    case 'tv':
      if (/playstation/.test(n)) return 'cartonL';
      if (/fire tv stick|dualsense/.test(n)) return 'smallbox';
      return 'tvpanel';
    case 'appliances':
      return /bulb/.test(n) ? 'smallbox' : 'cartonL';
    case 'wearables':
      return 'watchbox';
    case 'accessories':
      if (/bag|backpack/.test(n)) return 'pouch';
      if (/mouse|keyboard|power bank|bank/.test(n)) return 'smallbox';
      return 'blister';
    case 'personal_care':
      if (/toothpaste/.test(n)) return 'tubebox';
      if (/toothbrush/.test(n)) return 'brushbox';
      if (/soap|bathing/.test(n)) return 'soapbox';
      if (/deodorant/.test(n)) return 'can';
      if (/chyawanprash/.test(n)) return 'jar';
      if (/razor|pads/.test(n)) return 'smallbox';
      if (/powder/.test(n)) return 'jar';
      return 'bottle';
    case 'household':
      if (/detergent powder/.test(n)) return 'pouch';
      if (/flask|liquid|gel|cleaner|handwash/.test(n)) return 'bottle';
      return 'smallbox';
    default: {
      if (/red bull/.test(n)) return 'can';
      if (/atta|rice|dal |sugar|salt|chips|noodles|bhujia|munch|masala|mad angles/.test(n)) return 'pouch';
      if (/ghee|jam|honey|ketchup/.test(n)) return 'jar';
      if (/drink|cola|water|juice|oil|thums|sprite|pepsi|dew|limca|7up|maaza|frooti/.test(n)) return 'bottle';
      return 'carton';
    }
  }
}

/** [width, height, depth] in metres, real size, and whether it is drawn at 2.2x (small) or 1.4x (large). */
const REAL: Record<PackKind, [number, number, number, 's' | 'l', boolean?]> = {
  phonebox: [0.075, 0.155, 0.045, 's'],
  tabletbox: [0.18, 0.26, 0.05, 's'],
  earbudbox: [0.07, 0.1, 0.04, 's'],
  headphonebox: [0.2, 0.24, 0.09, 's'],
  speakerbox: [0.12, 0.2, 0.12, 's'],
  laptopbox: [0.38, 0.27, 0.06, 'l'],
  smallbox: [0.12, 0.1, 0.08, 's'],
  tvpanel: [0.95, 0.56, 0.05, 'l'],
  cartonL: [0.34, 0.34, 0.3, 'l'],
  watchbox: [0.09, 0.12, 0.05, 's'],
  blister: [0.1, 0.18, 0.015, 's'],
  tubebox: [0.04, 0.17, 0.04, 's'],
  brushbox: [0.045, 0.2, 0.03, 's'],
  soapbox: [0.09, 0.06, 0.06, 's'],
  bottle: [0.08, 0.25, 0.08, 'l', true],
  jar: [0.09, 0.12, 0.09, 'l', true],
  pouch: [0.2, 0.28, 0.06, 'l'],
  carton: [0.15, 0.22, 0.07, 'l'],
  can: [0.066, 0.12, 0.066, 's', true],
};
export const MAX_PACK_W = 0.45;
export const MAX_PACK_H = 0.44; // clear height between two shelf levels

export interface PackDims {
  w: number;
  h: number;
  d: number;
  round: boolean;
}

/** Display size: 2.2x small items, 1.4x large items, clamped to the shelf clearance (TV panels are real panels). */
export function packDims(kind: PackKind, r?: PackRow): PackDims {
  const [w, h, d, cls, round] = REAL[kind];
  if (kind === 'tvpanel') {
    const inch = r ? Number(/(\d{2})\s*inch/.exec(r.name)?.[1] ?? 43) : 43;
    const k = inch / 43;
    return { w: 0.95 * k, h: 0.56 * k, d: 0.05, round: false };
  }
  const s = Math.min(cls === 's' ? 2.2 : 1.4, MAX_PACK_H / h, MAX_PACK_W / w);
  return { w: w * s, h: h * s, d: d * s, round: !!round };
}

/** Width of the shelf slot a product needs, in metres. A stock group is always the width of 3 units so shelves never reflow. */
export function slotWidth(r: PackRow): number {
  const k = packKind(r);
  const dm = packDims(k, r);
  if (k === 'tvpanel') return dm.w + 0.3;
  return modeOf(r.category) === 'single' ? dm.w + 0.08 : 3 * (dm.w + 0.03) + 0.08;
}

/** Preferred shelf level 1..4 (bottom to top): heavy and large low, everyday in the middle, small and valuable at eye level. */
export function preferredLevel(r: PackRow): number {
  const k = packKind(r);
  const n = r.name.toLowerCase();
  if (k === 'tvpanel' || k === 'cartonL') return 1;
  if (/\b(2|5) ?kg\b/.test(n) || /\b1 ?l\b/.test(n) || /750 ?ml|650 ?ml|950 ?ml|975 ?ml|550 ?ml|500 ?ml|400 ?ml/.test(n)) return 1;
  if (r.category === 'mobiles') return k === 'tabletbox' ? 2 : r.price_paise >= 100000 * 100 ? 4 : 3;
  if (r.category === 'audio') return k === 'speakerbox' ? 2 : r.price_paise >= 10000 * 100 ? 4 : 3;
  if (r.category === 'computing') return k === 'laptopbox' ? (r.price_paise >= 90000 * 100 ? 4 : 3) : 2;
  if (r.category === 'wearables') return r.price_paise >= 15000 * 100 ? 4 : 3;
  if (r.category === 'accessories') return k === 'blister' ? 3 : 2;
  if (k === 'bottle' || k === 'pouch') return 2;
  return 3; // small everyday items (tubes, soaps, snacks, sachets) at eye level
}

const KIND_ORDER: PackKind[] = ['tubebox', 'brushbox', 'soapbox', 'bottle', 'jar', 'can', 'smallbox', 'pouch', 'carton', 'blister', 'earbudbox', 'headphonebox', 'speakerbox'];
/** Sub-family sort key: type first for everyday goods and audio, otherwise brand (all Apple phones together). */
export function subFamily(r: PackRow): string {
  const k = packKind(r);
  if (['personal_care', 'household', 'grocery', 'audio', 'accessories'].includes(r.category)) return `${String(KIND_ORDER.indexOf(k) + 10)}-${r.brand.toLowerCase()}`;
  return r.brand.toLowerCase();
}

export const BRAND_COLORS: Record<string, string> = {
  Apple: '#1D1D1F', Samsung: '#1428A0', Sony: '#111111', boAt: '#D8232A', realme: '#F5C518', OnePlus: '#EB0028', Google: '#4285F4',
  Xiaomi: '#FF6900', vivo: '#415FFF', OPPO: '#1C8B5D', Motorola: '#5C92FA', Nothing: '#111111', Lenovo: '#E2231A', HP: '#0096D6',
  Dell: '#007DB8', ASUS: '#00539B', Acer: '#83B81A', LG: '#A50034', Colgate: '#D5232F', Pepsodent: '#0054A6', Sensodyne: '#00A3AD',
  'Oral-B': '#1D70B8', Dabur: '#3A9E3A', Dettol: '#1F8E3D', Lifebuoy: '#D5232F', Dove: '#6A8FB5', Lux: '#C3398A', 'Surf Excel': '#1465B7',
  Ariel: '#1B75BC', Tide: '#F26A21', Vim: '#2BA84A', Harpic: '#1C7DC5', Maggi: '#E0262B', Parle: '#F5A623', Britannia: '#D32F2F',
  Cadbury: '#4B2A86', Amul: '#D62828', Tata: '#1D4E89', Aashirvaad: '#E97C1F', Fortune: '#F1A500', 'Coca-Cola': '#E41E26', Pepsi: '#004B93',
  'Thums Up': '#111111', Sprite: '#2BA84A', "Lay's": '#F9C80E', Kurkure: '#E4572E', "Haldiram's": '#E63946', 'Red Bull': '#1E3A8A',
};
const DEPT_COLORS: Record<string, string> = {
  audio: '#0E7C7B', mobiles: '#0F1F2E', computing: '#64748B', tv: '#0F1F2E', appliances: '#64748B', wearables: '#0E7C7B',
  accessories: '#64748B', personal_care: '#0E7C7B', household: '#0E7C7B', grocery: '#F59E0B',
};
export const brandColor = (brand: string, category: string): string => BRAND_COLORS[brand] ?? DEPT_COLORS[category] ?? '#0E7C7B';

