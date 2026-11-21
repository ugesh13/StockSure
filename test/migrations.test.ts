import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

test('F1 Migrations: file names are contiguous and 002 exists', () => {
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'sql');
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

  // 1. Check 002 exists
  const has002 = files.some((f) => f.startsWith('002_'));
  assert.ok(has002, 'Migration 002 file must exist in sql/');

  // 2. Check file names are contiguous starting from 001
  const numbers = files.map((f) => {
    const m = f.match(/^(\d{3})_/);
    assert.ok(m, `File ${f} must start with 3 digits and an underscore`);
    return parseInt(m[1], 10);
  });

  assert.equal(numbers[0], 1, 'First migration must be 001');
  for (let i = 0; i < numbers.length; i++) {
    assert.equal(numbers[i], i + 1, `Migration numbers must be contiguous: expected ${i + 1}, got ${numbers[i]}`);
  }
});
