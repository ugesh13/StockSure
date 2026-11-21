import crypto from 'node:crypto';
import { getPool, withTx } from '../db.ts';

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
