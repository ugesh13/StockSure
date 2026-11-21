import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfigOrExit } from '../src/config.ts';
import { closePool, getPool } from '../src/db.ts';
import { generateStore, placementPos, SHELF_DEPTH } from '../src/domain/layout/index.ts';
import type { PackRow } from '../src/domain/layout/index.ts';

// Rebuild shelf_locations (the 3D store map) from the ACTIVE products, at every branch.
// shelf_locations is derived data: it is safe to run again at any time. Touches no stock, orders or customers.

loadConfigOrExit(['pg']);

export async function runSeedLayout(): Promise<{ products: number; rows: number; aisles: number }> {
  const pool = getPool();
  const products = (await pool.query<PackRow>('SELECT id, category, brand, name, price_paise FROM products WHERE is_active ORDER BY id')).rows;
  const branches = (await pool.query<{ id: number }>('SELECT id FROM branches ORDER BY id')).rows;
  const store = generateStore(products);

  const cols = { branch: [] as number[], product: [] as number[], aisle: [] as string[], bay: [] as number[], level: [] as number[], slot: [] as number[], x: [] as number[], y: [] as number[], z: [] as number[], sx: [] as number[], sz: [] as number[] };
  let placed = 0;
  for (const aisle of store.aisles) {
    for (const p of aisle.placements) {
      placed++;
      const pos = placementPos(aisle, p);
      const sign = p.slot === 1 ? 1 : -1;
      const standZ = aisle.z + sign * (SHELF_DEPTH + 0.6);
      for (const b of branches) {
        cols.branch.push(b.id);
        cols.product.push(p.productId);
        cols.aisle.push(aisle.code);
        cols.bay.push(pos.bay);
        cols.level.push(p.level);
        cols.slot.push(p.slot);
        cols.x.push(Number(pos.x.toFixed(4)));
        cols.y.push(Number(pos.y.toFixed(4)));
        cols.z.push(Number(pos.z.toFixed(4)));
        cols.sx.push(Number(pos.x.toFixed(4)));
        cols.sz.push(Number(standZ.toFixed(4)));
      }
    }
  }
  const missing = products.length - placed;
  if (missing > 0) console.warn(`${missing} active products have a category with no aisle and were not placed (see src/domain/layout/departments.ts).`);

  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query('DELETE FROM shelf_locations');
    await c.query(
      `INSERT INTO shelf_locations (branch_id, product_id, aisle, bay, level, slot, x, y, z, stand_x, stand_z)
       SELECT * FROM unnest($1::int[], $2::int[], $3::text[], $4::int[], $5::int[], $6::int[], $7::double precision[], $8::double precision[], $9::double precision[], $10::double precision[], $11::double precision[])`,
      [cols.branch, cols.product, cols.aisle, cols.bay, cols.level, cols.slot, cols.x, cols.y, cols.z, cols.sx, cols.sz],
    );
    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
  return { products: placed, rows: cols.branch.length, aisles: store.aisles.length };
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile)) {
  runSeedLayout()
    .then((r) => console.log(`Shelf layout: ${r.products} products placed in ${r.aisles} aisles, ${r.rows} shelf rows across all branches.`))
    .then(() => closePool())
    .catch((err) => {
      console.error('Layout seed error:', err);
      process.exit(1);
    });
}
