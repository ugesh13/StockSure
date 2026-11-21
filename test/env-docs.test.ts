import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('F7: Env and Docs Parity', async (t) => {
  const rootDir = path.resolve(import.meta.dirname, '..');
  const envExamplePath = path.join(rootDir, '.env.example');
  const configPath = path.join(rootDir, 'src', 'config.ts');

  const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
  const configContent = fs.readFileSync(configPath, 'utf8');

  // Extract keys from .env.example (KEY=...)
  const envExampleKeys = new Set(
    envExampleContent
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#') && l.includes('='))
      .map((l) => l.split('=')[0].trim())
  );

  // Extract keys defined in Schema in src/config.ts
  // Matching property keys inside Schema = z.object({ ... })
  const schemaBlock = configContent.match(/const Schema = z\.object\(\{([\s\S]*?)\}\);/)?.[1] ?? '';
  const schemaKeys = new Set(
    schemaBlock
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('//') && l.includes(':'))
      .map((l) => l.split(':')[0].trim())
  );

  await t.test('1. Every env name read in src/config.ts appears in .env.example', () => {
    // Deprecated aliases allowed to not be primary in .env.example
    const configAliases = new Set(['CORS_ORIGIN']);

    for (const key of schemaKeys) {
      if (configAliases.has(key)) continue;
      assert.ok(
        envExampleKeys.has(key),
        `Key ${key} in src/config.ts Schema is missing from .env.example`
      );
    }
  });

  await t.test('2. Every name in .env.example is read somewhere in src/, scripts/ or documented in allowlist', () => {
    // Read all files in src/ and scripts/
    const allCodeFiles: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
          allCodeFiles.push(full);
        }
      }
    };
    walk(path.join(rootDir, 'src'));
    walk(path.join(rootDir, 'scripts'));

    const allCodeText = allCodeFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');

    // Documented allowlist for variables intentionally present for deployment/runtime options
    const documentedAllowlist = new Set<string>([
      'API_URL',
      'WORKER_PG_POOL_MAX',
      'STAFF_API_KEY',
    ]);

    for (const key of envExampleKeys) {
      const inSchema = schemaKeys.has(key);
      const readInCode = allCodeText.includes(key);
      const inAllowlist = documentedAllowlist.has(key);

      assert.ok(
        inSchema || readInCode || inAllowlist,
        `Key ${key} in .env.example is neither in src/config.ts Schema, nor read in src/ or scripts/, nor in the documented allowlist`
      );
    }
  });
});
