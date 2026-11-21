export interface CatalogueProduct {
  id: number;
  category: string;
  brand: string;
  name: string;
  price_paise: number;
  price_flag: 'v' | 'i';
  source_url: string | null;
  checked_on: string | null;
  tags: string[];
}

const SYNONYM_GROUPS: string[][] = [
  ['tulsi', 'tulasi', 'holy basil', 'basil'],
  ['rose', 'gulab', 'rosa'],
  ['jasmine', 'mogra', 'mallige'],
  ['aloe', 'aloe vera', 'ghritkumari'],
  ['curry leaf', 'kadi patta', 'karibevu'],
  ['snake plant', 'sansevieria', 'saas ki jeebh'],
  ['hibiscus', 'gudhal', 'dasavala'],
  ['marigold', 'genda', 'chendu hoovu'],
  ['sapling', 'seedling', 'plant'],
  ['pot', 'planter', 'gamla'],
];

const SYNONYM_MAP = new Map<string, Set<string>>();
for (const group of SYNONYM_GROUPS) {
  for (const term of group) {
    let set = SYNONYM_MAP.get(term.toLowerCase());
    if (!set) {
      set = new Set<string>();
      SYNONYM_MAP.set(term.toLowerCase(), set);
    }
    for (const other of group) {
      if (other !== term) set.add(other.toLowerCase());
    }
  }
}

export function generateSearchTags(dept: string, brand: string, name: string): string[] {
  const tags = new Set<string>();
  tags.add(dept.toLowerCase());
  tags.add(brand.toLowerCase());

  // Tokenize
  const lower = `${dept} ${brand} ${name}`.toLowerCase();
  const words = lower.replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(Boolean);
  for (const w of words) {
    if (w.length > 1) tags.add(w);
    const syns = SYNONYM_MAP.get(w);
    if (syns) {
      for (const s of syns) tags.add(s);
    }
  }

  // Multi-word synonyms check (e.g. 'cooking oil', 'bathing soap', 'smart tv')
  for (const [phrase, syns] of SYNONYM_MAP.entries()) {
    if (phrase.includes(' ') && lower.includes(phrase)) {
      for (const s of syns) tags.add(s);
    }
  }

  return Array.from(tags);
}

export function parseAndValidateCatalogue(psv: string): CatalogueProduct[] {
  const lines = psv.trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error('Catalogue PSV is empty or missing data rows');
  }

  const header = lines[0]!.trim();
  const expectedHeader = 'id|dept|brand|name|price_rupees|flag|source_url|checked_on';
  if (header !== expectedHeader) {
    throw new Error(`Invalid catalogue header: expected "${expectedHeader}", got "${header}"`);
  }

  const seenIds = new Set<number>();
  const products: CatalogueProduct[] = [];

  for (let idx = 1; idx < lines.length; idx++) {
    const rawLine = lines[idx]!.trim();
    if (!rawLine) continue;
    const parts = rawLine.split('|');
    if (parts.length !== 8) {
      throw new Error(`Line ${idx + 1} has ${parts.length} columns, expected 8`);
    }

    const [idStr, dept, brand, name, priceStr, flag, sourceUrlRaw, checkedOnRaw] = parts;
    const id = Number(idStr);
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(`Line ${idx + 1}: invalid product id "${idStr}"`);
    }
    if (seenIds.has(id)) {
      throw new Error(`Line ${idx + 1}: duplicate product id ${id}`);
    }
    seenIds.add(id);

    if (!dept || !brand || !name) {
      throw new Error(`Line ${idx + 1}: missing required department, brand, or name`);
    }

    const priceRupees = Number(priceStr);
    if (isNaN(priceRupees) || priceRupees <= 0) {
      throw new Error(`Line ${idx + 1}: non-positive or invalid price "${priceStr}"`);
    }

    if (flag !== 'i' && flag !== 'v') {
      throw new Error(`Line ${idx + 1}: invalid price flag "${flag}" (must be 'i' or 'v')`);
    }

    const sourceUrl = sourceUrlRaw ? sourceUrlRaw.trim() : null;
    const checkedOn = checkedOnRaw ? checkedOnRaw.trim() : null;

    if (flag === 'v' && (!sourceUrl || !checkedOn)) {
      throw new Error(`Line ${idx + 1}: flag 'v' requires both source_url and checked_on`);
    }

    const tags = generateSearchTags(dept, brand, name);

    products.push({
      id,
      category: dept,
      brand,
      name,
      price_paise: Math.round(priceRupees * 100),
      price_flag: flag,
      source_url: sourceUrl,
      checked_on: checkedOn,
      tags,
    });
  }

  return products;
}

