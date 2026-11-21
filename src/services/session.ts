import crypto from 'node:crypto';
import { getPool, withTx } from '../db.ts';
import { AppError } from '../errors.ts';

export async function createSession(name?: string): Promise<{ customer_id: number; token: string; name: string | null }> {
  const tokenBytes = crypto.randomBytes(32);
  const token = tokenBytes.toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const guestName = name?.trim() ? name.trim() : null;
  const guestEmail = `guest_${tokenBytes.subarray(0, 8).toString('hex')}@stocksure.local`;

  return withTx(async (c) => {
    const custRes = await c.query<{ id: number }>(
      'INSERT INTO customers (name, email) VALUES ($1, $2) RETURNING id',
      [guestName ?? 'Guest Shopper', guestEmail],
    );
    const customerId = custRes.rows[0]!.id;

    await c.query(
      `INSERT INTO sessions (customer_id, token_hash, name, expires_at)
       VALUES ($1, $2, $3, now() + interval '24 hours')`,
      [customerId, tokenHash, guestName],
    );

    return {
      customer_id: customerId,
      token,
      name: guestName,
    };
  });
}

export async function sweepSessionsOnce(): Promise<number> {
  const pool = getPool();
  await pool.query('DELETE FROM sessions WHERE expires_at < now()');
  const res = await pool.query(`
    DELETE FROM customers
     WHERE email LIKE 'guest_%@stocksure.local'
       AND id NOT IN (SELECT customer_id FROM orders)
       AND id NOT IN (SELECT customer_id FROM sessions)
  `);
  return res.rowCount ?? 0;
}

export async function deleteCustomerAccount(customerId: number): Promise<{ ok: true; message: string }> {
  return withTx(async (c) => {
    // 1. Refuse with 409 while the customer has an AWAITING_PAYMENT order
    const pending = await c.query<{ id: string }>(
      `SELECT id FROM orders WHERE customer_id = $1 AND status = 'AWAITING_PAYMENT' LIMIT 1`,
      [customerId],
    );
    if (pending.rows.length > 0) {
      throw new AppError(409, 'ACTIVE_ORDER_EXISTS', 'Cannot delete account while an order is awaiting payment.');
    }

    // 2. Delete cart items and cart
    await c.query(`DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE customer_id = $1)`, [customerId]);
    await c.query(`DELETE FROM carts WHERE customer_id = $1`, [customerId]);

    // 3. Delete back-in-stock alerts
    await c.query(`DELETE FROM stock_alerts WHERE customer_id = $1`, [customerId]);

    // 4. Delete kiosk cart codes
    await c.query(`DELETE FROM cart_codes WHERE customer_id = $1`, [customerId]);

    // 5. Delete sessions
    await c.query(`DELETE FROM sessions WHERE customer_id = $1`, [customerId]);

    // 6. Anonymise customer row
    const anonEmail = `deleted_${customerId}@stocksure.local`;
    await c.query(
      `UPDATE customers SET name = 'Deleted', email = $1, phone = NULL WHERE id = $2`,
      [anonEmail, customerId],
    );

    return { ok: true, message: 'Account deleted and personal data anonymized.' };
  });
}
