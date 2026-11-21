import { loadConfigOrExit } from './config.ts';
import { handleAlerts, ALERTS_GROUP } from './consumers/alerts.ts';
import { handleFinalizer, FINALIZER_GROUP } from './consumers/finalizer.ts';
import { handleIndexer, INDEXER_GROUP } from './consumers/indexer.ts';
import { handleNotifier, NOTIFIER_GROUP } from './consumers/notifier.ts';
import { closePool } from './db.ts';
import { closeKafka, TOPICS } from './kafka/client.ts';
import { runConsumer } from './kafka/consumer.ts';
import type { ConsumerSpec } from './kafka/consumer.ts';
import { log, errFields } from './log.ts';
import { ensureIndex } from './search/opensearch.ts';

// Worker process: consumers only. Each consumer is its own consumer group, so each reads every event independently.
// Small pool (3): the free Postgres plan allows 20 connections in total (API 5 + worker 3 + 3 spare stays comfortably under 20).
// The worker's pool is set here, not by PG_POOL_MAX (that one is the API's pool and .env.example sets it to 5).
process.env.PG_POOL_MAX = process.env.WORKER_PG_POOL_MAX ?? '3';
loadConfigOrExit(['pg', 'kafka', 'opensearch']);

const specs: ConsumerSpec[] = [
  { group: FINALIZER_GROUP, topic: TOPICS.orders, handle: handleFinalizer },
  { group: NOTIFIER_GROUP, topic: TOPICS.orders, handle: handleNotifier },
  { group: INDEXER_GROUP, topic: TOPICS.inventory, handle: handleIndexer },
  { group: ALERTS_GROUP, topic: TOPICS.inventory, handle: handleAlerts },
];

try {
  await ensureIndex().catch((e) => log('warn', 'could not ensure search index at start', errFields(e)));
  const running = await Promise.all(specs.map((s) => runConsumer(s)));
  log('info', 'worker started', { consumers: specs.map((s) => s.group) });

  let closing = false;
  const shutdown = async (signal: string) => {
    if (closing) return;
    closing = true;
    log('info', 'worker shutting down', { signal });
    await Promise.allSettled(running.map((c) => c.disconnect()));
    await closeKafka();
    await closePool();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
} catch (e) {
  log('error', 'worker failed to start', errFields(e));
  process.exit(1);
}
