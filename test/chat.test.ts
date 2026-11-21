import test from 'node:test';
import assert from 'node:assert/strict';
import { processChatMessage } from '../src/services/chat.ts';

test('P1-BOT 1: identifies greeting and human handoff intents', async () => {
  const greeting = await processChatMessage('Hello there!');
  assert.equal(greeting.intent, 'GREETING');
  assert.ok(greeting.reply.includes('Welcome to StockSure'));
  assert.ok(Array.isArray(greeting.suggestions));

  const handoff = await processChatMessage('I want to speak with an agent');
  assert.equal(handoff.intent, 'HUMAN_HANDOFF');
  assert.ok(handoff.reply.includes('care@stocksure.in'));
});

test('P1-BOT 2: resolves search queries to show_products action', async () => {
  const res = await processChatMessage('find monstera plant');
  assert.equal(res.intent, 'FIND_PLANT');
  assert.equal(res.action?.type, 'show_products');
  assert.ok(res.action.payload?.query.includes('monstera'));
});

test('P1-BOT 3: navigation action strictly enforces route whitelist', async () => {
  const navShop = await processChatMessage('go to shop');
  assert.equal(navShop.intent, 'NAVIGATE');
  assert.equal(navShop.action?.type, 'navigate');
  assert.equal(navShop.action?.payload?.route, 'shop');

  const navOrders = await processChatMessage('open orders');
  assert.equal(navOrders.intent, 'NAVIGATE');
  assert.equal(navOrders.action?.type, 'navigate');
  assert.equal(navOrders.action?.payload?.route, 'orders');
});

test('P1-BOT 4: answers common questions from FAQ database', async () => {
  const deliveryFaq = await processChatMessage('how fast is your delivery?');
  assert.equal(deliveryFaq.intent, 'HELP_FAQ');
  assert.ok(deliveryFaq.reply.includes('45 minutes'));

  const feeFaq = await processChatMessage('what are your delivery charges?');
  assert.equal(feeFaq.intent, 'DELIVERY_QUOTE');
  assert.ok(feeFaq.reply.includes('FREE on all orders of ₹999'));
});

test('P1-BOT 5: extracts order UUID for live order tracking', async () => {
  const orderId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const track = await processChatMessage(`where is order ${orderId}`);
  assert.equal(track.intent, 'ORDER_STATUS');
  assert.equal(track.action?.type, 'show_order');
  assert.equal(track.action?.payload?.order_id, orderId);
});

test('P1-BOT 6: rejects empty message and enforces 500-character ceiling', async () => {
  await assert.rejects(
    async () => {
      await processChatMessage('');
    },
    /(EMPTY_MESSAGE|cannot be empty)/
  );

  const longMessage = 'a'.repeat(501);
  await assert.rejects(
    async () => {
      await processChatMessage(longMessage);
    },
    /(MESSAGE_TOO_LONG|exceed 500 characters)/
  );
});
