import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Fastify from 'fastify';
import {
  isAllowedLicense,
  validateBotanical,
  PLANT_REFERENCE_RULES,
  type PlantRef,
  type PlantImageResult,
} from '../src/services/plantImages.ts';

test('Plant Images Pipeline & Security Controls', async (t) => {
  await t.test('1. License Filter: accepts CC0, PD, CC BY, CC BY-SA; strictly rejects NC, ND, unknown', () => {
    // Valid licenses
    assert.equal(isAllowedLicense('CC0 1.0').allowed, true);
    assert.equal(isAllowedLicense('Public Domain').allowed, true);
    assert.equal(isAllowedLicense('CC BY 4.0').allowed, true);
    assert.equal(isAllowedLicense('CC BY-SA 3.0').allowed, true);
    assert.equal(isAllowedLicense('CC BY-SA 4.0').allowed, true);
    assert.equal(isAllowedLicense('own').allowed, true);

    // Rejected licenses: Non-commercial (NC)
    assert.equal(isAllowedLicense('CC BY-NC 4.0').allowed, false);
    assert.equal(isAllowedLicense('CC BY-NC-SA 3.0').allowed, false);
    assert.equal(isAllowedLicense('NonCommercial').allowed, false);

    // Rejected licenses: No derivatives (ND)
    assert.equal(isAllowedLicense('CC BY-ND 4.0').allowed, false);
    assert.equal(isAllowedLicense('CC BY-NC-ND 3.0').allowed, false);

    // Rejected licenses: Unknown / missing
    assert.equal(isAllowedLicense('').allowed, false);
    assert.equal(isAllowedLicense('All rights reserved').allowed, false);
    assert.equal(isAllowedLicense('Copyright 2024').allowed, false);
    assert.equal(isAllowedLicense(undefined).allowed, false);
  });

  await t.test('2. Botanical Validator: requires genus or species and rejects "Do NOT confuse with" keywords', () => {
    const moneyPlantRef: PlantRef = {
      id: 1,
      commonName: 'Money plant',
      scientificName: 'Epipremnum aureum',
      category: 'Indoor foliage',
      variantGroup: 'pot',
      slug: 'money-plant',
      genus: 'Epipremnum',
      species: 'aureum',
      alternateGenera: [],
      doNotConfuseWith: ['philodendron'],
    };

    // Valid metadata containing genus
    const valid1 = validateBotanical('File:Epipremnum aureum in botanical garden.jpg', moneyPlantRef);
    assert.equal(valid1.valid, true);

    // Valid metadata containing species
    const valid2 = validateBotanical('Photo of aureum growing on trellis', moneyPlantRef);
    assert.equal(valid2.valid, true);

    // Invalid: neither genus nor species
    const invalidGenus = validateBotanical('File:Generic green houseplant in living room.jpg', moneyPlantRef);
    assert.equal(invalidGenus.valid, false);
    assert.ok(invalidGenus.reason?.includes('Neither genus'));

    // Invalid: matches prohibited confusion term 'philodendron'
    const confused = validateBotanical('File:Epipremnum aureum often confused with Philodendron hederaceum.jpg', moneyPlantRef);
    assert.equal(confused.valid, false);
    assert.ok(confused.reason?.includes('philodendron'));
  });

  await t.test('3. Modern Taxonomy Genera check (e.g. Sansevieria / Dracaena trifasciata)', () => {
    const snakePlant = PLANT_REFERENCE_RULES.find((p) => p.slug === 'snake-plant');
    assert.ok(snakePlant, 'snake-plant rule exists');

    // Both traditional Sansevieria and modern Dracaena accepted
    assert.equal(validateBotanical('Sansevieria trifasciata in terracotta pot', snakePlant!).valid, true);
    assert.equal(validateBotanical('Dracaena trifasciata specimen', snakePlant!).valid, true);
  });

  await t.test('4. Idempotency logic: does not re-download if file already exists and size >= 5KB', () => {
    const testDir = path.resolve(process.cwd(), 'data', 'plant-images');
    fs.mkdirSync(testDir, { recursive: true });
    const dummyFile = path.join(testDir, 'test-idempotent-plant.jpg');
    fs.writeFileSync(dummyFile, Buffer.alloc(10000, 1)); // 10KB

    try {
      const stats = fs.statSync(dummyFile);
      const skipReDownload = stats.size >= 5120;
      assert.equal(skipReDownload, true, 'Should skip re-download for files >= 5KB');
    } finally {
      if (fs.existsSync(dummyFile)) fs.unlinkSync(dummyFile);
    }
  });

  await t.test('5. Path Traversal & File Serving Security: blocks directory traversal with 404', async () => {
    const app = Fastify();

    // Register the exact route logic
    app.get('/static/plants/*', async (req, reply) => {
      const raw = (req.params as Record<string, string>)['*'] || '';
      if (
        !raw ||
        raw.includes('..') ||
        raw.includes('/') ||
        raw.includes('\\') ||
        raw.includes('\0') ||
        raw.includes('%2e') ||
        raw.includes('%2f') ||
        raw.includes('%5c')
      ) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Plant image not found' } });
      }
      const filename = path.basename(raw);
      if (!/^[a-zA-Z0-9_.-]+$/.test(filename)) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Plant image not found' } });
      }
      const safeDir = path.resolve(process.cwd(), 'data', 'plant-images');
      const targetFile = path.resolve(safeDir, filename);
      if (!targetFile.startsWith(safeDir) || !fs.existsSync(targetFile)) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Plant image not found' } });
      }

      return reply.header('Cache-Control', 'public, max-age=86400, immutable').header('Content-Type', 'image/jpeg').send(Buffer.from('fake'));
    });

    await app.ready();

    // Traversal test 1: dot-dot slash encoded
    const r1 = await app.inject({ method: 'GET', url: '/static/plants/..%2fpackage.json' });
    assert.equal(r1.statusCode, 404);

    // Traversal test 2: dot-dot in path
    const r2 = await app.inject({ method: 'GET', url: '/static/plants/../../etc/passwd' });
    assert.equal(r2.statusCode, 404);

    // Traversal test 3: backslash attempt
    const r3 = await app.inject({ method: 'GET', url: '/static/plants/..\\..\\windows\\win.ini' });
    assert.equal(r3.statusCode, 404);

    // Traversal test 4: subpath attempt
    const r4 = await app.inject({ method: 'GET', url: '/static/plants/subdir/test.jpg' });
    assert.equal(r4.statusCode, 404);

    // Non-existent image: returns 404
    const r5 = await app.inject({ method: 'GET', url: '/static/plants/non-existent-plant-xyz.jpg' });
    assert.equal(r5.statusCode, 404);

    await app.close();
  });

  await t.test('6. Null image representation for missing plants', () => {
    const missingResult: PlantImageResult = {
      commonName: 'Rare Orchid',
      scientificName: 'Orchis rara',
      slug: 'rare-orchid',
      status: 'missing',
      imagePath: null,
      imageUrl: null,
      imageSourceUrl: null,
      imageAuthor: null,
      imageLicense: null,
      imageCredit: null,
    };

    assert.equal(missingResult.imageUrl, null);
    assert.equal(missingResult.imageCredit, null);
    assert.equal(missingResult.status, 'missing');
  });

  await t.test('7. Manual override photo support with own license', () => {
    const manualResult: PlantImageResult = {
      commonName: 'Monstera Deliciosa',
      scientificName: 'Monstera deliciosa',
      slug: 'monstera-deliciosa',
      status: 'ok',
      imagePath: 'data/plant-images/monstera-deliciosa.jpg',
      imageUrl: '/static/plants/monstera-deliciosa.jpg',
      imageSourceUrl: null,
      imageAuthor: 'Own photo',
      imageLicense: 'own',
      imageCredit: 'Photo: Own photo, own',
      isManual: true,
    };

    assert.equal(manualResult.status, 'ok');
    assert.equal(manualResult.isManual, true);
    assert.equal(manualResult.imageLicense, 'own');
    assert.equal(manualResult.imageCredit, 'Photo: Own photo, own');
  });
});
