import fs from 'node:fs/promises';
import path from 'node:path';
import { loadConfigOrExit } from '../src/config.ts';
import { buildApp } from '../src/app.ts';

loadConfigOrExit(['pg']);

async function main() {
  process.env.DOCS_ENABLED = 'true';
  const app = await buildApp();
  await app.ready();
  const spec = (app as any).swagger();
  const outPath = path.resolve(process.cwd(), 'openapi.json');
  await fs.writeFile(outPath, JSON.stringify(spec, null, 2) + '\n', 'utf8');
  console.log('Exported OpenAPI specification to', outPath);
  await app.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to export OpenAPI specification:', err);
  process.exit(1);
});
