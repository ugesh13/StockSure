import crypto from 'node:crypto';
import { getPool } from '../db.ts';
import { AppError, badInput, notFound } from '../errors.ts';
import { hashPassword, verifyPassword, DUMMY_HASH } from '../auth/crypto.ts';
import { checkLockout, recordFailure, resetFailures } from '../auth/lockout.ts';
import { defaultMailer, type Mailer } from '../auth/mailer.ts';

export type AuthResponse = {
  customer_id: number;
  token: string;
  name: string;
  email: string | null;
};

export type MeResponse = {
  customer_id: number;
  name: string;
  email: string | null;
  phone: string | null;
  is_guest: boolean;
};

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw.trim()).digest('hex');
}

export async function registerCustomer(
  input: { name: string; email: string; password: string; phone?: string },
  guestToken?: string,
): Promise<AuthResponse> {
  const pool = getPool();
  const email = input.email.toLowerCase().trim();
  const password = input.password;

  if (password.length < 8 || password.length > 128) {
    throw badInput('Password must be between 8 and 128 characters');
  }

  // Check duplicate email
  const existing = await pool.query<{ id: number }>('SELECT id FROM customers WHERE lower(email) = $1', [email]);
  if (existing.rows.length > 0) {
    throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
  }

  const hashedPassword = await hashPassword(password);

  // If a valid guest token is provided, check if we can upgrade the guest customer record
  if (guestToken) {
    const gHash = hashToken(guestToken);
    const sessionRes = await pool.query<{ customer_id: number }>(
      'SELECT customer_id FROM sessions WHERE token_hash = $1 AND expires_at > now()',
      [gHash],
    );
    if (sessionRes.rows.length > 0) {
      const guestCustId = sessionRes.rows[0]!.customer_id;
      const guestRes = await pool.query<{ id: number; password_hash: string | null; email: string | null }>(
        'SELECT id, password_hash, email FROM customers WHERE id = $1',
        [guestCustId],
      );
      const guest = guestRes.rows[0];
      if (guest && !guest.password_hash) {
        // Upgrade guest row: cart, alerts, orders stay
        await pool.query(
          'UPDATE customers SET name = $1, email = $2, password_hash = $3, phone = COALESCE($4, phone) WHERE id = $5',
          [input.name.trim(), email, hashedPassword, input.phone?.trim() ?? null, guestCustId],
        );
        return {
          customer_id: guestCustId,
          token: guestToken,
          name: input.name.trim(),
          email,
        };
      }
    }
  }

  // Create new customer
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const custRes = await client.query<{ id: number }>(
      'INSERT INTO customers (name, email, password_hash, phone) VALUES ($1, $2, $3, $4) RETURNING id',
      [input.name.trim(), email, hashedPassword, input.phone?.trim() ?? null],
    );
    const customerId = custRes.rows[0]!.id;

    // Create session token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    await client.query(
      "INSERT INTO sessions (token_hash, customer_id, expires_at) VALUES ($1, $2, now() + interval '30 days')",
      [tokenHash, customerId],
    );

    await client.query('COMMIT');
    return {
      customer_id: customerId,
      token,
      name: input.name.trim(),
      email,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function loginCustomer(
  input: { email: string; password: string },
  guestToken?: string,
  clientIp: string = '',
): Promise<AuthResponse> {
  const pool = getPool();
  const email = input.email.toLowerCase().trim();

  if (checkLockout(email, clientIp)) {
    throw new AppError(429, 'TOO_MANY_ATTEMPTS', 'Too many failed login attempts. Please try again in 15 minutes.');
  }

  const custRes = await pool.query<{
    id: number;
    name: string;
    email: string;
    phone: string | null;
    password_hash: string | null;
  }>('SELECT id, name, email, phone, password_hash FROM customers WHERE lower(email) = $1', [email]);

  const customer = custRes.rows[0];

  if (!customer) {
    // Constant-time dummy verify to prevent timing enumeration
    await verifyPassword(input.password, DUMMY_HASH);
    recordFailure(email, clientIp);
    throw new AppError(401, 'BAD_CREDENTIALS', 'Invalid email or password');
  }

  if (!customer.password_hash || !(await verifyPassword(input.password, customer.password_hash))) {
    recordFailure(email, clientIp);
    throw new AppError(401, 'BAD_CREDENTIALS', 'Invalid email or password');
  }

  // Clear failed attempts on success
  resetFailures(email, clientIp);

  // If a guest token is provided, merge guest cart into account cart
  if (guestToken) {
    const gHash = hashToken(guestToken);
    const gSessionRes = await pool.query<{ customer_id: number }>(
      'SELECT customer_id FROM sessions WHERE token_hash = $1 AND expires_at > now()',
      [gHash],
    );
    if (gSessionRes.rows.length > 0) {
      const guestCustId = gSessionRes.rows[0]!.customer_id;
      if (guestCustId !== customer.id) {
        await mergeGuestCart(guestCustId, customer.id);

        // Retire guest row only if it has no orders
        const ordersRes = await pool.query<{ count: string }>(
          'SELECT count(*)::text as count FROM orders WHERE customer_id = $1',
          [guestCustId],
        );
        const orderCount = parseInt(ordersRes.rows[0]?.count ?? '0', 10);
        if (orderCount === 0) {
          await pool.query('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE customer_id = $1)', [guestCustId]);
          await pool.query('DELETE FROM carts WHERE customer_id = $1', [guestCustId]);
          await pool.query('DELETE FROM sessions WHERE customer_id = $1', [guestCustId]);
          await pool.query('DELETE FROM stock_alerts WHERE customer_id = $1', [guestCustId]);
          await pool.query('DELETE FROM cart_codes WHERE customer_id = $1', [guestCustId]);
          await pool.query('DELETE FROM customers WHERE id = $1', [guestCustId]);
        } else {
          // Clear guest cart and revoke presented guest session
          await pool.query('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE customer_id = $1)', [guestCustId]);
          await pool.query('DELETE FROM sessions WHERE token_hash = $1', [gHash]);
        }
      }
    }
  }

  // Generate new session token for the user
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  await pool.query(
    "INSERT INTO sessions (token_hash, customer_id, expires_at) VALUES ($1, $2, now() + interval '30 days')",
    [tokenHash, customer.id],
  );

  return {
    customer_id: customer.id,
    token,
    name: customer.name,
    email: customer.email,
  };
}

async function mergeGuestCart(guestCustId: number, accountCustId: number): Promise<void> {
  const pool = getPool();

  // Find guest cart items
  const itemsRes = await pool.query<{ product_id: number; branch_id: number; qty: number }>(`
    SELECT ci.product_id, ci.branch_id, ci.qty
    FROM cart_items ci
    JOIN carts c ON c.id = ci.cart_id
    WHERE c.customer_id = $1
  `, [guestCustId]);

  if (itemsRes.rows.length === 0) return;

  // Ensure account has a cart
  let cartRes = await pool.query<{ id: number }>('SELECT id FROM carts WHERE customer_id = $1', [accountCustId]);
  let accountCartId = cartRes.rows[0]?.id;
  if (!accountCartId) {
    const newCart = await pool.query<{ id: number }>(
      'INSERT INTO carts (customer_id) VALUES ($1) ON CONFLICT (customer_id) DO UPDATE SET updated_at = now() RETURNING id',
      [accountCustId],
    );
    accountCartId = newCart.rows[0]!.id;
  }

  for (const item of itemsRes.rows) {
    // Check available inventory: on_hand - reserved - buffer
    const invRes = await pool.query<{ avail: number }>(
      'SELECT GREATEST(on_hand - reserved - buffer, 0) as avail FROM inventory WHERE product_id = $1 AND branch_id = $2',
      [item.product_id, item.branch_id],
    );
    const available = invRes.rows[0]?.avail ?? 0;

    // Check existing account cart qty
    const existingRes = await pool.query<{ qty: number }>(
      'SELECT qty FROM cart_items WHERE cart_id = $1 AND product_id = $2 AND branch_id = $3',
      [accountCartId, item.product_id, item.branch_id],
    );
    const existingQty = existingRes.rows[0]?.qty ?? 0;

    const sumQty = existingQty + item.qty;
    const cappedQty = Math.min(sumQty, available, 10);

    if (cappedQty > 0) {
      await pool.query(`
        INSERT INTO cart_items (cart_id, product_id, branch_id, qty)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (cart_id, product_id, branch_id) DO UPDATE SET qty = EXCLUDED.qty
      `, [accountCartId, item.product_id, item.branch_id, cappedQty]);
    }
  }
}

export async function logoutCustomer(token: string): Promise<void> {
  const pool = getPool();
  const tokenHash = hashToken(token);
  await pool.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
}

export async function getCustomerMe(customerId: number): Promise<MeResponse> {
  const pool = getPool();
  const res = await pool.query<{
    customer_id: number;
    name: string;
    email: string | null;
    phone: string | null;
    password_hash: string | null;
  }>('SELECT id as customer_id, name, email, phone, password_hash FROM customers WHERE id = $1', [customerId]);

  const row = res.rows[0];
  if (!row) throw notFound('Customer');

  return {
    customer_id: row.customer_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    // Guest sessions get a placeholder email (guest_<hex>@stocksure.local), so "has an email" does not mean "registered".
    is_guest: !row.password_hash,
  };
}

export async function forgotPassword(email: string, mailer: Mailer = defaultMailer): Promise<{ ok: boolean }> {
  const pool = getPool();
  const normalized = email.toLowerCase().trim();

  const custRes = await pool.query<{ id: number }>('SELECT id FROM customers WHERE lower(email) = $1', [normalized]);
  const customer = custRes.rows[0];

  if (customer) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);

    await pool.query(
      "INSERT INTO password_reset_tokens (token_hash, customer_id, expires_at) VALUES ($1, $2, now() + interval '30 minutes')",
      [tokenHash, customer.id],
    );

    const resetLink = `https://stocksure.local/reset-password?token=${rawToken}`;
    await mailer.sendPasswordReset(normalized, resetLink);
  }

  // Always return 202 accepted to prevent user enumeration
  return { ok: true };
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const pool = getPool();

  if (newPassword.length < 8 || newPassword.length > 128) {
    throw badInput('Password must be between 8 and 128 characters');
  }

  const tokenHash = hashToken(token);
  const tokenRes = await pool.query<{ id: number; customer_id: number; expires_at: Date; used_at: Date | null }>(
    'SELECT id, customer_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = $1',
    [tokenHash],
  );

  const row = tokenRes.rows[0];
  if (!row || row.used_at || new Date(row.expires_at).getTime() <= Date.now()) {
    throw new AppError(400, 'INVALID_TOKEN', 'Password reset token is invalid or has expired');
  }

  const hashedPassword = await hashPassword(newPassword);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Mark token used. The used_at guard makes two concurrent resets with the same token impossible.
    const claimed = await client.query('UPDATE password_reset_tokens SET used_at = now() WHERE id = $1 AND used_at IS NULL', [row.id]);
    if ((claimed.rowCount ?? 0) === 0) {
      throw new AppError(400, 'INVALID_TOKEN', 'Password reset token is invalid or has expired');
    }

    // Update password
    await client.query('UPDATE customers SET password_hash = $1 WHERE id = $2', [hashedPassword, row.customer_id]);

    // Revoke ALL existing sessions for this customer
    await client.query('DELETE FROM sessions WHERE customer_id = $1', [row.customer_id]);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
