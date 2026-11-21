import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfigOrExit } from '../src/config.ts';
import { closePool, getPool } from '../src/db.ts';

loadConfigOrExit(['pg']);

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function stableHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export type RawPlant = {
  category: string;
  common_name: string;
  hindi_name: string;
  kannada_name: string;
  scientific_name: string;
  variant_group: 'pot' | 'sapling';
  source_check: string;
};

export function parseCsv(csvText: string): RawPlant[] {
  const lines = csvText.trim().split(/\r?\n/);
  const rows: RawPlant[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line) continue;
    // CSV columns: category,common_name,hindi_name,kannada_name,scientific_name,variant_group,source_check
    const parts = line.split(',');
    if (parts.length < 7) continue;
    const [category, common_name, hindi_name, kannada_name, scientific_name, variant_group, source_check] = parts;
    rows.push({
      category: category!.trim(),
      common_name: common_name!.trim(),
      hindi_name: hindi_name!.trim(),
      kannada_name: kannada_name!.trim(),
      scientific_name: scientific_name!.trim(),
      variant_group: variant_group!.trim() as 'pot' | 'sapling',
      source_check: source_check!.trim(),
    });
  }
  return rows;
}

export const POT_VARIANTS = [
  { size: '4-inch', suffix: '4-inch pot', price_paise: 7900 },
  { size: '6-inch', suffix: '6-inch pot', price_paise: 17900 },
  { size: '8-inch', suffix: '8-inch pot', price_paise: 34900 },
];

export const SAPLING_VARIANTS = [
  { size: '1-ft', suffix: '1-ft sapling', price_paise: 14900 },
  { size: '2-ft', suffix: '2-ft sapling', price_paise: 29900 },
  { size: '3-ft', suffix: '3-ft sapling', price_paise: 54900 },
];

export function buildAliases(p: RawPlant): string[] {
  const set = new Set<string>();
  const add = (s?: string) => {
    if (!s) return;
    const clean = s.trim().toLowerCase();
    if (clean) set.add(clean);
  };

  add(p.common_name);
  // Remove parenthetical notes from common name
  const strippedCommon = p.common_name.replace(/\(.*?\)/g, '').trim();
  add(strippedCommon);
  const matchParen = p.common_name.match(/\((.*?)\)/);
  if (matchParen?.[1]) add(matchParen[1].trim());

  if (p.hindi_name) {
    for (const h of p.hindi_name.split('/')) add(h);
  }
  if (p.kannada_name) {
    for (const k of p.kannada_name.split('/')) add(k);
  }
  add(p.scientific_name);

  // Domain specific aliases & synonym expansions
  const lower = p.common_name.toLowerCase();
  if (lower.includes('tulsi')) {
    add('tulasi');
    add('holy basil');
    add('ocimum tenuiflorum');
    add('ocimum');
    add('basil');
  }
  if (lower.includes('rose') || lower === 'rose') {
    add('gulab');
    add('gulabi');
    add('rosa');
  }
  if (lower.includes('jasmine') || lower.includes('mogra')) {
    add('mogra');
    add('mallige');
    add('arabian jasmine');
    add('jasminum sambac');
  }
  if (lower.includes('aloe') || lower.includes('ghritkumari')) {
    add('aloe vera');
    add('ghritkumari');
    add('lolesara');
  }
  if (lower.includes('neem')) {
    add('neem');
    add('bevu');
    add('azadirachta indica');
  }
  if (lower.includes('curry leaf')) {
    add('kadi patta');
    add('karibevu');
    add('murraya koenigii');
  }
  if (lower.includes('snake plant')) {
    add('snake plant');
    add('naagin');
    add('sansevieria');
    add('sansevieria trifasciata');
    add('saas ki jeebh');
  }
  if (lower.includes('hibiscus')) {
    add('hibiscus');
    add('gudhal');
    add('dasavala');
  }
  if (lower.includes('marigold')) {
    add('marigold');
    add('genda');
    add('chendu hoovu');
    add('tagetes erecta');
  }
  if (lower.includes('desert rose')) {
    add('desert rose');
    add('adenium');
    add('adenium obesum');
  }

  return Array.from(set);
}

export function buildTags(p: RawPlant, variantName: string, aliases: string[]): string[] {
  const tags = new Set<string>();
  const addTokens = (str: string) => {
    for (const word of str.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/)) {
      if (word.length > 1) tags.add(word);
    }
  };

  addTokens(p.category);
  addTokens(p.common_name);
  if (p.hindi_name) addTokens(p.hindi_name);
  if (p.kannada_name) addTokens(p.kannada_name);
  if (p.scientific_name) addTokens(p.scientific_name);
  addTokens(variantName);
  for (const a of aliases) addTokens(a);

  return Array.from(tags);
}

export async function runSeedNursery() {
  const pool = getPool();

  console.log('--- SEED NURSERY START ---');

  // Counts before
  const beforeProds = await pool.query<{ count: string }>('SELECT count(*)::text as count FROM products WHERE is_active = true');
  const beforeNursery = await pool.query<{ count: string }>('SELECT count(*)::text as count FROM products WHERE is_nursery = true');
  const beforeInventory = await pool.query<{ count: string }>('SELECT count(*)::text as count FROM inventory');
  console.log(`Before seed: active products = ${beforeProds.rows[0]?.count}, nursery products = ${beforeNursery.rows[0]?.count}, inventory rows = ${beforeInventory.rows[0]?.count}`);

  // Deactivate legacy products
  await pool.query('UPDATE products SET is_active = false WHERE is_nursery IS NOT TRUE');

  // Read CSV
  const csvCandidates = [
    path.resolve(process.cwd(), 'data/nursery_plants_seed.csv'),
    path.resolve(process.cwd(), '../data/nursery_plants_seed.csv'),
    path.resolve(process.cwd(), 'Backend/data/nursery_plants_seed.csv'),
  ];
  let csvPath = '';
  for (const c of csvCandidates) {
    if (fs.existsSync(c)) {
      csvPath = c;
      break;
    }
  }
  if (!csvPath) throw new Error('nursery_plants_seed.csv not found in data directories');
  const csvText = fs.readFileSync(csvPath, 'utf8');
  const plants = parseCsv(csvText);
  if (plants.length !== 53) {
    throw new Error(`Expected exactly 53 plants, got ${plants.length}`);
  }

  // Fetch branches
  const branchesRes = await pool.query<{ id: number }>('SELECT id FROM branches ORDER BY id');
  const branches = branchesRes.rows;
  if (branches.length < 3) {
    throw new Error(`Expected at least 3 branches, found ${branches.length}`);
  }

  let insertedCount = 0;
  const demoSkus: Record<string, string> = {
    rescue: 'PLANT-tulsi-holy-basil-6-inch-pot',
    race: 'PLANT-snake-plant-6-inch-pot',
    oos: 'PLANT-desert-rose-8-inch-pot',
    stale: 'PLANT-marigold-4-inch-pot',
  };

  for (const p of plants) {
    const variants = p.variant_group === 'pot' ? POT_VARIANTS : SAPLING_VARIANTS;
    const aliases = buildAliases(p);

    for (const v of variants) {
      const sku = `PLANT-${slugify(p.common_name)}-${slugify(v.suffix)}`;
      const name = `${p.common_name}, ${v.suffix}`;
      const tags = buildTags(p, v.suffix, aliases);

      // Upsert product
      const prodRes = await pool.query<{ id: number }>(
        `INSERT INTO products (
          sku, name, brand, category, tags, price_paise,
          is_active, is_nursery, plant_common_name, variant_group, variant_size,
          scientific_name, name_hi, name_kn, aliases
        ) VALUES (
          $1, $2, 'StockSure Nursery', $3, $4, $5,
          true, true, $6, $7, $8,
          $9, $10, $11, $12
        )
        ON CONFLICT (sku) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          tags = EXCLUDED.tags,
          price_paise = EXCLUDED.price_paise,
          is_active = true,
          is_nursery = true,
          plant_common_name = EXCLUDED.plant_common_name,
          variant_group = EXCLUDED.variant_group,
          variant_size = EXCLUDED.variant_size,
          scientific_name = EXCLUDED.scientific_name,
          name_hi = EXCLUDED.name_hi,
          name_kn = EXCLUDED.name_kn,
          aliases = EXCLUDED.aliases
        RETURNING id`,
        [
          sku,
          name,
          p.category,
          tags,
          v.price_paise,
          p.common_name,
          p.variant_group,
          v.size,
          p.scientific_name || null,
          p.hindi_name || null,
          p.kannada_name || null,
          aliases,
        ],
      );

      const productId = prodRes.rows[0]!.id;
      insertedCount++;

      // Upsert plant_attributes
      await pool.query(
        `INSERT INTO plant_attributes (product_id, scientific_name, name_hi, name_kn, category, aliases)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (product_id) DO UPDATE SET
           scientific_name = EXCLUDED.scientific_name,
           name_hi = EXCLUDED.name_hi,
           name_kn = EXCLUDED.name_kn,
           category = EXCLUDED.category,
           aliases = EXCLUDED.aliases`,
        [productId, p.scientific_name || null, p.hindi_name || null, p.kannada_name || null, p.category, aliases],
      );

      // Upsert inventory for each branch
      for (const b of branches) {
        // Stock rule: on_hand = 5 + (stable_hash(sku || branch_id) % 16), reserved = 0
        const onHand = 5 + (stableHash(`${sku}${b.id}`) % 16);
        await pool.query(
          `INSERT INTO inventory (branch_id, product_id, on_hand, reserved, buffer, rev, updated_at)
           VALUES ($1, $2, $3, 0, 1, 0, now())
           ON CONFLICT (branch_id, product_id) DO UPDATE SET
             on_hand = EXCLUDED.on_hand,
             reserved = 0,
             buffer = 1,
             updated_at = now()`,
          [b.id, productId, onHand],
        );
      }
    }
  }

  // Apply DEMO OVERRIDES
  // 1. DEMO-RESCUE: Tulsi 6-inch pot: branch 1 on_hand 0, branch 2 on_hand 4, branch 3 on_hand 2
  const tulsiRes = await pool.query<{ id: number }>('SELECT id FROM products WHERE sku = $1', [demoSkus.rescue]);
  const tulsiId = tulsiRes.rows[0]?.id;
  if (tulsiId) {
    await pool.query('UPDATE inventory SET on_hand = 0, reserved = 0, buffer = 0 WHERE product_id = $1 AND branch_id = 1', [tulsiId]);
    await pool.query('UPDATE inventory SET on_hand = 4, reserved = 0, buffer = 0 WHERE product_id = $1 AND branch_id = 2', [tulsiId]);
    await pool.query('UPDATE inventory SET on_hand = 2, reserved = 0, buffer = 0 WHERE product_id = $1 AND branch_id = 3', [tulsiId]);
  }

  // 2. DEMO-RACE: Snake plant 6-inch pot: branch 1 on_hand 1, all other branches 0
  const snakeRes = await pool.query<{ id: number }>('SELECT id FROM products WHERE sku = $1', [demoSkus.race]);
  const snakeId = snakeRes.rows[0]?.id;
  if (snakeId) {
    await pool.query('UPDATE inventory SET on_hand = 1, reserved = 0, buffer = 0 WHERE product_id = $1 AND branch_id = 1', [snakeId]);
    await pool.query('UPDATE inventory SET on_hand = 0, reserved = 0, buffer = 0 WHERE product_id = $1 AND branch_id <> 1', [snakeId]);
  }

  // 3. DEMO-OOS: Desert rose 8-inch pot: 0 at every branch
  const desertRes = await pool.query<{ id: number }>('SELECT id FROM products WHERE sku = $1', [demoSkus.oos]);
  const desertId = desertRes.rows[0]?.id;
  if (desertId) {
    await pool.query('UPDATE inventory SET on_hand = 0, reserved = 0, buffer = 0 WHERE product_id = $1', [desertId]);
  }

  // 4. DEMO-STALE: Marigold 4-inch pot at branch 3: freshness timestamp older than STALE_SECONDS (60s)
  await pool.query("UPDATE branches SET last_heartbeat_at = now() - interval '2 hours' WHERE id = 3");
  await pool.query('UPDATE branches SET last_heartbeat_at = now() WHERE id <> 3');

  // Counts after
  const afterProds = await pool.query<{ count: string }>('SELECT count(*)::text as count FROM products WHERE is_active = true');
  const afterNursery = await pool.query<{ count: string }>('SELECT count(*)::text as count FROM products WHERE is_nursery = true');
  const afterInventory = await pool.query<{ count: string }>('SELECT count(*)::text as count FROM inventory');
  const plantAttrCount = await pool.query<{ count: string }>('SELECT count(*)::text as count FROM plant_attributes');

  console.log(`After seed: active products = ${afterProds.rows[0]?.count}, nursery products = ${afterNursery.rows[0]?.count}, plant_attributes = ${plantAttrCount.rows[0]?.count}, inventory rows = ${afterInventory.rows[0]?.count}`);
  console.log('--- SEED NURSERY COMPLETE ---');
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile)) {
  runSeedNursery()
    .then(() => closePool())
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}
