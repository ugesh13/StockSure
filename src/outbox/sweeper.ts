import { cfg } from '../config.ts';
import { log, errFields } from '../log.ts';
import { sweepOnce } from '../services/orders.ts';
import { sweepSessionsOnce } from '../services/session.ts';
import { sleep } from '../util.ts';

/** Every 30 s: expire unpaid orders past their hold and sweep expired sessions older than 24h. */
export function startSweeper(): { stop: () => Promise<void> } {
  let stopped = false;
  const done = (async () => {
    while (!stopped) {
      try {
        const [nOrders, nSessions] = await Promise.all([sweepOnce(), sweepSessionsOnce()]);
        if (nOrders > 0) log('info', 'expired unpaid orders', { count: nOrders });
        if (nSessions > 0) log('info', 'swept expired sessions', { count: nSessions });
      } catch (e) {
        log('error', 'sweeper failed, will retry', errFields(e));
      }
      // sleep in small steps so shutdown is quick
      for (let waited = 0; waited < cfg().SWEEP_INTERVAL_MS && !stopped; waited += 500) await sleep(500);
    }
  })();
  return {
    stop: async () => {
      stopped = true;
      await done;
    },
  };
}
