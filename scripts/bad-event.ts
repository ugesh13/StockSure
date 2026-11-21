import { randomUUID } from 'node:crypto';
import { loadConfigOrExit, cfg } from '../src/config.ts';
import { closePool, getPool } from '../src/db.ts';
import { partitionFor } from '../src/domain/partition.ts';
import { EventSchema } from '../src/events.ts';
import { closeKafka, getProducer, TOPICS } from '../src/kafka/client.ts';

// T8 helper: force a bad event, watch it land in the dead-letter topic, fix the data, replay it.
//   npm run bad-event -- publish          sends order.placed for an order that does not exist yet (prints its id)
//   npm run bad-event -- fix <order-id>   creates that order (PLACED, 1 unit of product 3 at branch 1) so the event can succeed
// Then: POST /admin/replay-dlq with X-Admin-Token. The same event now succeeds and stock is deducted once.
loadConfigOrExit(['pg', 'kafka']);
const [cmd, arg] = process.argv.slice(2);

try {
  if (cmd === 'publish') {
    const orderId = randomUUID();
    const event = EventSchema.parse({
      event_id: randomUUID(),
      type: 'order.placed',
      version: 1,
      occurred_at: new Date().toISOString(),
      data: { order_id: orderId, customer_id: 1, lines: [{ branch_id: 1, product_id: 3, qty: 1 }] },
    });
    const producer = await getProducer();
    await producer.send({
      topic: TOPICS.orders,
      acks: -1,
      messages: [{ key: orderId, value: JSON.stringify(event), partition: partitionFor(orderId, cfg().KAFKA_PARTITIONS) }],
    });
    console.log(`Published a bad order.placed. order id = ${orderId}`);
    console.log('Watch the worker logs: 3 failures, then "event sent to dlq". Then run: npm run bad-event -- fix ' + orderId);
  } else if (cmd === 'fix' && arg) {
    const pool = getPool();
    await pool.query(
      `INSERT INTO orders (id, customer_id, status, total_paise, fulfilment, idempotency_key, paid_at)
       VALUES ($1::uuid, 1, 'PLACED', 269900, 'PICKUP', 'bad-event-fix-' || $1::text, now())`,
      [arg],
    );
    await pool.query(`INSERT INTO order_lines (order_id, product_id, branch_id, qty, unit_price_paise) VALUES ($1::uuid, 3, 1, 1, 269900)`, [arg]);
    await pool.query(`UPDATE inventory SET reserved = reserved + 1, rev = rev + 1, updated_at = now() WHERE branch_id = 1 AND product_id = 3`);
    console.log('Order created. Now replay: curl -X POST -H "X-Admin-Token: $ADMIN_TOKEN" $API_URL/admin/replay-dlq');
  } else {
    console.error('Usage: npm run bad-event -- publish   |   npm run bad-event -- fix <order-id>');
    process.exitCode = 1;
  }
} finally {
  await closeKafka();
  await closePool();
}
