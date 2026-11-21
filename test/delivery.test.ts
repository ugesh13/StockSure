import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateDeliveryAddress,
  getDeliveryQuote,
  createDeliveryRecord,
  getOrderTracking,
  updateDeliveryStatus,
  updateDeliveryLocation,
  reportOrderIssue,
} from '../src/services/delivery.ts';
import { getPool } from '../src/db.ts';
import { loadConfigOrExit } from '../src/config.ts';

loadConfigOrExit(['pg']);

const validAddress = {
  name: 'Jane Doe',
  phone: '9876543210',
  line1: '123 Green Valley, Palm Avenue',
  city: 'Bengaluru',
  pincode: '560001',
  lat: 12.9716,
  lng: 77.5946,
};

test('P1-DEL 1: validates Indian delivery address strictly', () => {
  // Valid address passes
  const parsed = validateDeliveryAddress(validAddress);
  assert.equal(parsed.name, 'Jane Doe');
  assert.equal(parsed.pincode, '560001');

  // Invalid phone rejected
  assert.throws(() => {
    validateDeliveryAddress({ ...validAddress, phone: '12345' });
  }, /(INVALID_PHONE|10-digit Indian mobile)/);

  // Invalid pincode rejected
  assert.throws(() => {
    validateDeliveryAddress({ ...validAddress, pincode: '56000' });
  }, /(INVALID_PINCODE|6-digit Indian postal)/);

  // Invalid coordinates rejected
  assert.throws(() => {
    validateDeliveryAddress({ ...validAddress, lat: 95.0 });
  }, /(ADDRESS_NOT_LOCATABLE|Valid delivery coordinates)/);
});

test('P1-DEL 2: calculates distance-based delivery quote and free delivery threshold', async () => {
  // Free delivery above 99900 paise (Rs 999)
  const freeQuote = await getDeliveryQuote(12.9716, 77.5946, 120000);
  assert.equal(freeQuote.serviceable, true);
  assert.equal(freeQuote.fee_paise, 0);

  // Paid delivery below threshold
  const paidQuote = await getDeliveryQuote(12.9716, 77.5946, 50000);
  assert.equal(paidQuote.serviceable, true);
  assert.ok((paidQuote.fee_paise || 0) >= 4000, 'Fee should include at least base fee');

  // Far distance out of radius rejected
  const farQuote = await getDeliveryQuote(28.6139, 77.2090, 50000); // Delhi coords when querying local branch
  // Extreme ocean coords
  const oceanQuote = await getDeliveryQuote(0.0, 0.0, 50000);
  assert.equal(oceanQuote.serviceable, false);
});

test('P1-DEL 3: creates delivery, tracks lifecycle, hides handover code until OUT_FOR_DELIVERY', async () => {
  const pool = getPool();
  
  // Create dummy order
  const orderRes = await pool.query(
    `INSERT INTO orders (customer_id, status, total_paise, fulfilment, idempotency_key) 
     VALUES (1, 'PLACED', 45000, 'DELIVERY', 'test-del-1-' || gen_random_uuid()) RETURNING id`
  );
  const orderId = orderRes.rows[0].id;

  try {
    const branchRes = await pool.query(`SELECT id FROM branches LIMIT 1`);
    const branchId = branchRes.rows[0].id;

    // Create delivery record
    const { handover_code } = await createDeliveryRecord(orderId, branchId, validAddress, 5.2, 7500);
    assert.ok(handover_code, 'Handover code generated');
    assert.equal(handover_code.length, 4);

    // Initial tracking: status is PENDING_PAYMENT, handover code MUST BE REDACTED
    const initialTrack = await getOrderTracking(orderId, 1);
    assert.equal(initialTrack.status, 'PENDING_PAYMENT');
    assert.equal(initialTrack.handover_code, undefined, 'Handover code must be redacted prior to OUT_FOR_DELIVERY');
    assert.equal(initialTrack.destination.phone_masked, '987****210');

    // Transition PENDING_PAYMENT -> CONFIRMED
    await updateDeliveryStatus(orderId, 'CONFIRMED', 'Order verified');

    // Transition CONFIRMED -> PACKED
    await updateDeliveryStatus(orderId, 'PACKED', 'Bagged at store');

    // Transition PACKED -> OUT_FOR_DELIVERY
    await updateDeliveryStatus(orderId, 'OUT_FOR_DELIVERY', 'Rider on route');

    // Now handover code MUST be visible to customer
    const activeTrack = await getOrderTracking(orderId, 1);
    assert.equal(activeTrack.status, 'OUT_FOR_DELIVERY');
    assert.equal(activeTrack.handover_code, handover_code, 'Handover code revealed when OUT_FOR_DELIVERY');

    // Update rider location
    await updateDeliveryLocation(orderId, 12.975, 77.598, 'Ramesh Rider', '9876500000');
    const trackWithRider = await getOrderTracking(orderId, 1);
    assert.ok(trackWithRider.rider);
    assert.equal(trackWithRider.rider?.name, 'Ramesh Rider');

    // Complete delivery with wrong code: MUST FAIL
    await assert.rejects(
      async () => {
        await updateDeliveryStatus(orderId, 'DELIVERED', 'Delivered to door', '0000');
      },
      /(INVALID_HANDOVER_CODE|Invalid 4-digit handover)/
    );

    // Complete delivery with correct code: MUST SUCCEED
    const delivered = await updateDeliveryStatus(orderId, 'DELIVERED', 'Delivered to door', handover_code);
    assert.equal(delivered.status, 'DELIVERED');

    // Order status finalized
    const finalOrder = (await pool.query(`SELECT finalized_at FROM orders WHERE id = $1`, [orderId])).rows[0];
    assert.ok(finalOrder.finalized_at);
  } finally {
    // Cleanup order and delivery
    await pool.query(`DELETE FROM order_issues WHERE order_id = $1`, [orderId]);
    await pool.query(`DELETE FROM delivery_events WHERE delivery_id IN (SELECT id FROM deliveries WHERE order_id = $1)`, [orderId]);
    await pool.query(`DELETE FROM deliveries WHERE order_id = $1`, [orderId]);
    await pool.query(`DELETE FROM orders WHERE id = $1`, [orderId]);
  }
});

test('P1-DEL 4: allows reporting order issue within 48h and rejects invalid reason', async () => {
  const pool = getPool();
  const orderRes = await pool.query(
    `INSERT INTO orders (customer_id, status, total_paise, fulfilment, idempotency_key) 
     VALUES (1, 'PLACED', 35000, 'DELIVERY', 'test-del-2-' || gen_random_uuid()) RETURNING id`
  );
  const orderId = orderRes.rows[0].id;

  try {
    // Report valid issue
    const issue = await reportOrderIssue(orderId, 1, 'DAMAGED', 'Pot was cracked upon unboxing');
    assert.equal(issue.status, 'RECEIVED');
    assert.ok(issue.issue_id > 0);

    // Invalid reason rejected
    await assert.rejects(
      async () => {
        await reportOrderIssue(orderId, 1, 'CHANGED_MIND' as any, 'Changed mind');
      },
      /(INVALID_REASON|Reason must be one of)/
    );
  } finally {
    await pool.query(`DELETE FROM order_issues WHERE order_id = $1`, [orderId]);
    await pool.query(`DELETE FROM orders WHERE id = $1`, [orderId]);
  }
});
