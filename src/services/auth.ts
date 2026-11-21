import crypto from 'node:crypto';
import { getPool, withTx } from '../db.ts';
import { AppError } from '../errors.ts';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(key, 'hex'));
}

export async function registerCustomer(params: {
  email: string;
  password: string;
  name: string;
  phone?: string;
}): Promise<{ customer_id: number; token: string; name: string; email: string }> {
  const pool = getPool();
  const email = params.email.trim().toLowerCase();
  const name = params.name.trim();

  // Check if customer already exists
  const existing = await pool.query('SELECT id, password_hash FROM customers WHERE LOWER(email) = $1', [email]);
  if (existing.rows.length > 0) {
    throw new AppError(409, 'EMAIL_EXISTS', 'An account with this email already exists. Please log in.');
  }

  const pHash = hashPassword(params.password);
  const tokenBytes = crypto.randomBytes(32);
  const token = tokenBytes.toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  return withTx(async (c) => {
    const custRes = await c.query<{ id: number }>(
      'INSERT INTO customers (name, email, phone, password_hash) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, email, params.phone?.trim() || null, pHash],
    );
    const customerId = custRes.rows[0]!.id;

    await c.query(
      `INSERT INTO sessions (customer_id, token_hash, name, expires_at)
       VALUES ($1, $2, $3, now() + interval '24 hours')`,
      [customerId, tokenHash, name],
    );

    return {
      customer_id: customerId,
      token,
      name,
      email,
    };
  });
}

export async function loginCustomer(params: {
  email: string;
  password: string;
}): Promise<{ customer_id: number; token: string; name: string; email: string }> {
  const pool = getPool();
  const email = params.email.trim().toLowerCase();

  const res = await pool.query<{ id: number; name: string; email: string; password_hash: string | null }>(
    'SELECT id, name, email, password_hash FROM customers WHERE LOWER(email) = $1',
    [email],
  );

  const customer = res.rows[0];
  if (!customer || !customer.password_hash) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  const isValid = verifyPassword(params.password, customer.password_hash);
  if (!isValid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  const tokenBytes = crypto.randomBytes(32);
  const token = tokenBytes.toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  await pool.query(
    `INSERT INTO sessions (customer_id, token_hash, name, expires_at)
     VALUES ($1, $2, $3, now() + interval '24 hours')`,
    [customer.id, tokenHash, customer.name],
  );

  return {
    customer_id: customer.id,
    token,
    name: customer.name,
    email: customer.email,
  };
}

export async function getCustomerProfile(customerId: number) {
  const pool = getPool();
  const res = await pool.query<{ id: number; name: string; email: string; phone: string | null }>(
    'SELECT id, name, email, phone FROM customers WHERE id = $1',
    [customerId],
  );
  if (res.rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Customer not found.');
  }
  return res.rows[0];
}

export async function logoutSession(token: string) {
  const pool = getPool();
  const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
  await pool.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
  return { ok: true, message: 'Logged out successfully' };
}
