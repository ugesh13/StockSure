import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { loadConfigOrExit, cfg } from '../src/config.ts';
import { getPool } from '../src/db.ts';

loadConfigOrExit(['pg']);

export async function runImageVerify(): Promise<{ ok: number; needsReview: number; missing: number }> {
  const pool = getPool();

  // Get status counts across distinct plants
  const statsRes = await pool.query<{ image_status: string; cnt: string }>(
    `SELECT COALESCE(image_status, 'missing') as image_status, COUNT(DISTINCT plant_common_name) as cnt
     FROM products
     WHERE is_active = true
     GROUP BY image_status`
  );

  let okCount = 0;
  let reviewCount = 0;
  let missingCount = 0;

  for (const row of statsRes.rows) {
    const c = parseInt(row.cnt, 10);
    if (row.image_status === 'ok') okCount = c;
    else if (row.image_status === 'needs_review') reviewCount = c;
    else missingCount += c;
  }

  // Get all active distinct plants with status = ok
  const rows = await pool.query<{
    plant_common_name: string;
    scientific_name: string;
    image_path: string | null;
    image_url: string | null;
    image_status: string;
  }>(
    `SELECT DISTINCT ON (plant_common_name) plant_common_name, scientific_name, image_path, image_url, image_status
     FROM products
     WHERE is_active = true AND image_status = 'ok'
     ORDER BY plant_common_name`
  );

  const baseUrl = process.env.API_URL || `http://localhost:${cfg().PORT || 3000}`;
  console.log(`Verifying ${rows.rows.length} plant images against ${baseUrl}...`);

  let failures = 0;

  for (const plant of rows.rows) {
    if (!plant.image_path && !plant.image_url) {
      console.error(`FAIL: ${plant.plant_common_name} is marked 'ok' but has null image_path and image_url`);
      failures++;
      continue;
    }

    const endpoint = plant.image_url?.startsWith('http')
      ? plant.image_url
      : `${baseUrl}${plant.image_url || `/static/plants/${plant.image_path}`}`;

    try {
      const res = await fetch(endpoint);
      if (res.status !== 200) {
        console.error(`FAIL: ${plant.plant_common_name} -> HTTP ${res.status} from ${endpoint}`);
        failures++;
        continue;
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) {
        console.error(`FAIL: ${plant.plant_common_name} -> Invalid Content-Type "${contentType}"`);
        failures++;
        continue;
      }

      const arrayBuffer = await res.arrayBuffer();
      const size = arrayBuffer.byteLength;
      if (size <= 5120) {
        console.error(`FAIL: ${plant.plant_common_name} -> File size too small (${size} bytes <= 5KB)`);
        failures++;
        continue;
      }

      console.log(`PASS: ${plant.plant_common_name} -> HTTP 200, ${contentType}, ${size} bytes`);
    } catch (err) {
      console.error(`FAIL: ${plant.plant_common_name} -> Request error:`, err);
      failures++;
    }
  }

  console.log(`\n=================================================`);
  console.log(`Images: ${okCount} ok / ${reviewCount} needs_review / ${missingCount} missing of 53`);
  console.log(`Verification: ${rows.rows.length - failures} passed, ${failures} failed`);
  console.log(`=================================================\n`);

  if (failures > 0) {
    process.exit(1);
  }

  return { ok: okCount, needsReview: reviewCount, missing: missingCount };
}

// When run directly as script
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runImageVerify()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal verify error:', err);
      process.exit(1);
    });
}
