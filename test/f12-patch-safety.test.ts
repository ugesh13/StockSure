import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isKafkaPatched, applyPatch } from '../scripts/patch-kafkajs.ts';

test('F12: Patch Safety Simulation on Temporary File', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stocksure-patch-test-'));
  const tempFile = path.join(tempDir, 'requestQueue.js');

  t.after(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  const unpatchedContent = `  scheduleCheckPendingRequests() {
    // If we're throttled: Schedule checkPendingRequests when the throttle
    // should be resolved. If there is already something scheduled we assume that that
    // will be fine, and potentially fix up a new timeout if needed at that time.
    // Note that if we're merely "overloaded" by having too many inflight requests
    // we will anyways check the queue when one of them gets fulfilled.
    let scheduleAt = this.throttledUntil - Date.now()
    if (!this.throttleCheckTimeoutId) {
      if (this.pending.length > 0) {
        scheduleAt = scheduleAt > 0 ? scheduleAt : CHECK_PENDING_REQUESTS_INTERVAL
      }
      this.throttleCheckTimeoutId = setTimeout(() => {
        this.throttleCheckTimeoutId = null
        this.checkPendingRequests()
      }, scheduleAt)
    }
  }`;

  await t.test('1. Unpatched file fails patch check (isKafkaPatched === false)', () => {
    fs.writeFileSync(tempFile, unpatchedContent, 'utf8');
    assert.equal(isKafkaPatched(tempFile), false);
  });

  await t.test('2. Applying patch transforms file and makes isKafkaPatched === true', () => {
    const success = applyPatch(tempFile);
    assert.equal(success, true);
    assert.equal(isKafkaPatched(tempFile), true);

    const patchedContent = fs.readFileSync(tempFile, 'utf8');
    assert.ok(patchedContent.includes('if (this.throttledUntil > Date.now())'));
    assert.ok(!patchedContent.includes('let scheduleAt = this.throttledUntil - Date.now()'));
  });

  await t.test('3. Non-existent file safely returns false without throwing', () => {
    const nonExistent = path.join(tempDir, 'missing.js');
    assert.equal(isKafkaPatched(nonExistent), false);
    assert.equal(applyPatch(nonExistent), false);
  });
});
