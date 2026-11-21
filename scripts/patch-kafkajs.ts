import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_TARGET_FILE = path.resolve(__dirname, '../node_modules/kafkajs/src/network/requestQueue/index.js');

export function isKafkaPatched(filePath?: string): boolean {
  const file = filePath ?? process.env.KAFKA_PATCH_CHECK_FILE ?? DEFAULT_TARGET_FILE;
  if (!fs.existsSync(file)) return false;
  try {
    const content = fs.readFileSync(file, 'utf8');
    const hasThrottledCheck = content.includes('if (this.throttledUntil > Date.now())');
    const hasOldBuggyCode = content.includes('let scheduleAt = this.throttledUntil - Date.now()');
    return hasThrottledCheck && !hasOldBuggyCode;
  } catch {
    return false;
  }
}

export function applyPatch(filePath?: string): boolean {
  const file = filePath ?? DEFAULT_TARGET_FILE;
  if (!fs.existsSync(file)) {
    return false;
  }
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('let scheduleAt = this.throttledUntil - Date.now()')) {
    const original = `  scheduleCheckPendingRequests() {
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

    const patched = `  scheduleCheckPendingRequests() {
    if (this.throttleCheckTimeoutId) {
      return
    }

    if (this.throttledUntil > Date.now()) {
      const scheduleAt = this.throttledUntil - Date.now()
      this.throttleCheckTimeoutId = setTimeout(() => {
        this.throttleCheckTimeoutId = null
        this.checkPendingRequests()
      }, scheduleAt)
    } else if (this.pending.length > 0) {
      this.throttleCheckTimeoutId = setTimeout(() => {
        this.throttleCheckTimeoutId = null
        this.checkPendingRequests()
      }, CHECK_PENDING_REQUESTS_INTERVAL)
    }
  }`;

    if (content.includes(original)) {
      content = content.replace(original, patched);
      fs.writeFileSync(file, content, 'utf8');
      console.log('Patched kafkajs scheduleCheckPendingRequests successfully.');
      return true;
    }
  }
  return isKafkaPatched(file);
}

// When run directly from CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (process.argv.includes('--check')) {
    const ok = isKafkaPatched();
    if (!ok) {
      console.error('KAFKAJS NOT PATCHED: Kafka health will time out');
      process.exit(1);
    }
    console.log('KafkaJS patch check: OK (patched)');
    process.exit(0);
  }
  applyPatch();
}
