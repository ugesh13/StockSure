import { cfg, loadConfigOrExit } from '../src/config.ts';
import { closeKafka, getAdmin, TOPICS } from '../src/kafka/client.ts';

// Creates the 3 topics (orders, inventory, dlq). The free plan allows 5 topics with 2 partitions each.
loadConfigOrExit(['kafka']);

try {
  const admin = await getAdmin();
  const existing = new Set(await admin.listTopics());
  const wanted = Object.values(TOPICS);
  const toCreate = wanted.filter((t) => !existing.has(t));

  if (toCreate.length > 0) {
    await admin.createTopics({
      waitForLeaders: true,
      topics: toCreate.map((topic) => ({ topic, numPartitions: cfg().KAFKA_PARTITIONS })),
    });
  }
  const meta = await admin.fetchTopicMetadata({ topics: wanted });
  for (const t of wanted) {
    const actual = meta.topics.find((m) => m.name === t)?.partitions.length ?? 0;
    const warn = actual < cfg().KAFKA_PARTITIONS ? `  <-- WARNING: needs ${cfg().KAFKA_PARTITIONS}. Set KAFKA_PARTITIONS=${actual} or recreate the topic.` : '';
    console.log(`${existing.has(t) ? 'exists ' : 'created'} ${t} (${actual} partitions)${warn}`);
    if (warn) process.exitCode = 1;
  }
} finally {
  await closeKafka();
}
