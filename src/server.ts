import { buildApp } from './app.ts';
import { cfg, loadConfigOrExit } from './config.ts';
import { closePool } from './db.ts';
import { closeKafka, getAdmin, getProducer } from './kafka/client.ts';
import { log, errFields } from './log.ts';
import { startRelay } from './outbox/relay.ts';
import { startSweeper } from './outbox/sweeper.ts';
import { ensureIndex } from './search/opensearch.ts';
import { refreshHealth, startHealthMonitor } from './services/health.ts';
import { isKafkaPatched } from '../scripts/patch-kafkajs.ts';

// API process: HTTP + outbox relay + expiry sweeper. Run exactly one copy of the relay.
loadConfigOrExit(['pg', 'kafka', 'opensearch', 'api']);

if (!isKafkaPatched()) {
  console.error('KAFKAJS NOT PATCHED: Kafka health will time out');
  log('error', 'KAFKAJS NOT PATCHED: Kafka health will time out');
}

try {
  // Search works without the index (Postgres fallback), so a failure here is a warning, not a crash.
  await ensureIndex().catch((e) => log('warn', 'could not ensure search index at start', errFields(e)));

  // Start-up warm-up: connect admin and producer at boot
  await Promise.allSettled([getAdmin(), getProducer()]);
  const healthMonitor = startHealthMonitor();
  await refreshHealth();

  const app = await buildApp();
  await app.listen({ host: '0.0.0.0', port: cfg().PORT });

  const relay = cfg().RUN_RELAY ? startRelay() : null;
  const sweeper = cfg().RUN_SWEEPER ? startSweeper() : null;
  log('info', 'api started', { port: cfg().PORT, relay: Boolean(relay), sweeper: Boolean(sweeper) });

  const isProd = process.env.NODE_ENV === 'production' || cfg().NODE_ENV === 'production';
  if (isProd && (process.env.DEMO_MODE === 'true' || cfg().DEMO_MODE)) {
    log('warn', 'DEMO_MODE=true is enabled in production; /demo/* routes are open');
  }

  let closing = false;
  const shutdown = async (signal: string) => {
    if (closing) return;
    closing = true;
    log('info', 'api shutting down', { signal });
    healthMonitor.stop();
    await app.close();
    await Promise.allSettled([relay?.stop(), sweeper?.stop()]);
    await closeKafka();
    await closePool();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
} catch (e) {
  log('error', 'api failed to start', errFields(e));
  process.exit(1);
}
