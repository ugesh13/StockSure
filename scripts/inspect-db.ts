import { loadConfigOrExit } from '../src/config.ts';
import { getPool } from '../src/db.ts';

loadConfigOrExit(['pg']);

async function main() {
  const p = getPool();
  const prodCols = await p.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products' ORDER BY ordinal_position"
  );
  console.log('PRODUCTS COLUMNS:', prodCols.rows);

  const plantCols = await p.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'plant_attributes' ORDER BY ordinal_position"
  );
  console.log('PLANT_ATTRIBUTES COLUMNS:', plantCols.rows);

  const branches = await p.query(
    "SELECT id, name, city, last_heartbeat_at FROM branches ORDER BY id"
  );
  console.log('BRANCHES COUNT:', branches.rows.length);
  console.log('BRANCHES:', branches.rows);

  const constraint = await p.query(
    "SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'orders'::regclass"
  );
  console.log('ORDERS CONSTRAINTS:', constraint.rows);

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
