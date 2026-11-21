import { loadConfigOrExit } from '../src/config.ts';
import { closePool, pingPg } from '../src/db.ts';
import { closeKafka, pingKafka } from '../src/kafka/client.ts';
import { pingOpenSearch } from '../src/search/opensearch.ts';
import { sleep } from '../src/util.ts';

// Wakes the three Aiven services (free services may be powered off when idle) and waits until all are healthy.
// Run it about 10 minutes before the demo. Set API_URL to also check the deployed API's /health.
loadConfigOrExit(['pg', 'kafka', 'opensearch']);

const deadline = Date.now() + 5 * 60_000;
const api = process.env.API_URL?.replace(/\/$/, '');

async function probe(name: string, fn: () => Promise<Record<string, unknown>>): Promise<boolean> {
  try {
    const r = await Promise.race([fn(), sleep(8000).then(() => Promise.reject(new Error('timeout')))]);
    console.log(`  ok    ${name} ${JSON.stringify(r)}`);
    return true;
  } catch (e) {
    console.log(`  wait  ${name}: ${e instanceof Error ? e.message.slice(0, 100) : 'not ready'}`);
    return false;
  }
}

let attempt = 0;
while (Date.now() < deadline) {
  attempt++;
  console.log(`\nAttempt ${attempt}`);
  const results = await Promise.all([probe('postgres  ', pingPg), probe('kafka     ', pingKafka), probe('opensearch', pingOpenSearch)]);
  if (api) {
    try {
      const res = await fetch(`${api}/health`, { signal: AbortSignal.timeout(8000) });
      console.log(`  ${res.ok ? 'ok   ' : 'wait '} api /health -> ${res.status}`);
      results.push(res.ok);
    } catch {
      console.log('  wait  api /health unreachable');
      results.push(false);
    }
  }
  if (results.every(Boolean)) {
    console.log('\nAll services are awake and healthy.');
    await closeKafka();
    await closePool();
    process.exit(0);
  }
  await sleep(10_000);
}
console.error('\nSome services did not wake within 5 minutes. Open the Aiven console and check their state.');
process.exit(1);
