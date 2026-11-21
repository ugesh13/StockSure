import type { Consumer } from 'kafkajs';
import { EventSchema } from '../events.ts';
import type { AppEvent } from '../events.ts';
import { log, errFields } from '../log.ts';
import { withRetry } from '../util.ts';
import { newConsumer } from './client.ts';
import { publishDlq } from './dlq.ts';

export type ConsumerSpec = {
  group: string; // one consumer group per consumer, so each one reads every event independently
  topic: string;
  handle: (event: AppEvent) => Promise<void>; // must be safe to run twice for the same event
};

/**
 * Every consumer wraps its handler the same way: validate (Zod), retry 3 times with a growing wait,
 * then park the message in the dead-letter topic. A bad message never blocks the ones behind it.
 */
export async function runConsumer(spec: ConsumerSpec): Promise<Consumer> {
  const consumer = newConsumer(spec.group);
  await consumer.connect();
  await consumer.subscribe({ topic: spec.topic, fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const raw = message.value?.toString() ?? '';
      const key = message.key?.toString() ?? null;

      let event: AppEvent;
      try {
        event = EventSchema.parse(JSON.parse(raw));
      } catch (e) {
        await publishDlq({ consumer: spec.group, source_topic: topic, key, error: `invalid event: ${(e as Error).message.slice(0, 300)}`, original: raw });
        return;
      }

      try {
        await withRetry(3, () => spec.handle(event));
      } catch (e) {
        log('error', 'handler failed after 3 tries', { consumer: spec.group, event_id: event.event_id, ...errFields(e) });
        await publishDlq({ consumer: spec.group, source_topic: topic, key, error: String((e as Error).message ?? e).slice(0, 500), original: raw });
      }
    },
  });

  log('info', 'consumer running', { group: spec.group, topic: spec.topic });
  return consumer;
}
