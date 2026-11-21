import { pingPg } from '../db.ts';
import { pingKafka } from '../kafka/client.ts';
import { pingOpenSearch } from '../search/opensearch.ts';
import { isKafkaPatched } from '../../scripts/patch-kafkajs.ts';
import { log, errFields } from '../log.ts';
import { withTimeout } from '../util.ts';

interface SingleCheckResult {
  ok: boolean;
  ms: number;
  lastSuccessAt: number;
  lastCheckAt: number;
  error?: string;
  data?: Record<string, unknown>;
}

let healthState: {
  postgres: SingleCheckResult;
  kafka: SingleCheckResult;
  opensearch: SingleCheckResult;
} = {
  postgres: { ok: false, ms: 0, lastSuccessAt: 0, lastCheckAt: 0, error: 'initializing' },
  kafka: { ok: false, ms: 0, lastSuccessAt: 0, lastCheckAt: 0, error: 'initializing' },
  opensearch: { ok: false, ms: 0, lastSuccessAt: 0, lastCheckAt: 0, error: 'initializing' },
};

let timer: NodeJS.Timeout | null = null;
let running = false;

async function probeService(name: 'postgres' | 'kafka' | 'opensearch', fn: () => Promise<Record<string, unknown>>): Promise<void> {
  const t0 = Date.now();
  try {
    const data = await withTimeout(fn(), 4000, `${name} ping`);
    const ms = Date.now() - t0;
    const now = Date.now();
    healthState[name] = {
      ok: true,
      ms,
      lastSuccessAt: now,
      lastCheckAt: now,
      data,
    };
  } catch (e) {
    const ms = Date.now() - t0;
    const now = Date.now();
    const errMsg = e instanceof Error ? e.message.slice(0, 120) : 'check failed';
    healthState[name] = {
      ...healthState[name],
      ok: false,
      ms,
      lastCheckAt: now,
      error: errMsg,
    };
    log('warn', `health check failed for ${name}`, errFields(e));
  }
}

export async function refreshHealth(): Promise<void> {
  if (running) return;
  running = true;
  try {
    await Promise.all([
      probeService('postgres', pingPg),
      probeService('kafka', pingKafka),
      probeService('opensearch', pingOpenSearch),
    ]);
  } finally {
    running = false;
  }
}

export function startHealthMonitor(): { stop: () => void } {
  if (timer) clearInterval(timer);
  // Initial probe asynchronously
  void refreshHealth();
  timer = setInterval(() => {
    void refreshHealth();
  }, 5000);
  return {
    stop: () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
  };
}

export function getHealth(): {
  status: 'ok' | 'degraded';
  ok: boolean;
  kafka_patch: boolean;
  services: {
    postgres: Record<string, unknown>;
    kafka: Record<string, unknown>;
    opensearch: Record<string, unknown>;
  };
  time: string;
} {
  const now = Date.now();
  const formatService = (res: SingleCheckResult) => {
    const age_ms = res.lastCheckAt > 0 ? now - res.lastCheckAt : 0;
    const isFresh = res.lastSuccessAt > 0 && now - res.lastSuccessAt <= 20_000;
    const ok = res.ok && isFresh;
    if (ok) {
      return { ok: true, ms: res.ms, age_ms, ...(res.data ?? {}) };
    }
    return {
      ok: false,
      ms: res.ms,
      age_ms,
      error: !isFresh && res.lastSuccessAt > 0 ? `health check stale (last success ${now - res.lastSuccessAt}ms ago)` : res.error ?? 'unhealthy',
    };
  };

  const postgres = formatService(healthState.postgres);
  const kafka = formatService(healthState.kafka);
  const opensearch = formatService(healthState.opensearch);

  const ok = Boolean(postgres.ok && kafka.ok && opensearch.ok);

  return {
    status: ok ? 'ok' : 'degraded',
    ok,
    kafka_patch: isKafkaPatched(),
    services: { postgres, kafka, opensearch },
    time: new Date().toISOString(),
  };
}

