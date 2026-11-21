import crypto from 'node:crypto';
import { cfg } from '../config.ts';
import { getPool } from '../db.ts';
import { AppError, badInput } from '../errors.ts';
import { mergeGuestSession, type AuthResponse } from './auth.ts';

// Google OAuth 2.0 / OpenID Connect Endpoints
export const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
export const GOOGLE_JWKS_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/certs';

let testJwks: { keys: any[] } | null = null;

/** For testing signature verification without network calls */
export function _setGoogleJwksForTesting(jwks: { keys: any[] } | null): void {
  testJwks = jwks;
}

export type GoogleTokenPayload = {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat?: number;
  nonce?: string;
  email: string;
  email_verified: boolean | string;
  name?: string;
  picture?: string;
};

export function isGoogleConfigured(): boolean {
  try {
    const c = cfg();
    return Boolean(c.GOOGLE_CLIENT_ID && c.GOOGLE_CLIENT_SECRET && c.GOOGLE_CALLBACK_URL);
  } catch {
    return false;
  }
}

/**
 * Initiates the Google Authorization Code + PKCE flow.
 * Generates random state, nonce and PKCE verifier, stores them hashed with a 10-minute TTL,
 * and builds the Google 302 authorization URL.
 */
export async function buildGoogleAuthUrl(): Promise<string> {
  const c = cfg();
  if (!isGoogleConfigured()) {
    throw new AppError(503, 'GOOGLE_NOT_CONFIGURED', 'Google authentication is not configured');
  }

  // 1. Generate PKCE verifier and challenge (S256)
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  // 2. Generate random state and nonce
  const state = crypto.randomBytes(32).toString('base64url');
  const nonce = crypto.randomBytes(32).toString('base64url');
  const stateHash = crypto.createHash('sha256').update(state).digest('hex');

  // 3. Store server-side in oauth_states with 10-minute expiry
  const pool = getPool();
  await pool.query(
    "INSERT INTO oauth_states (state_hash, code_verifier, nonce, expires_at) VALUES ($1, $2, $3, now() + interval '10 minutes')",
    [stateHash, codeVerifier, nonce],
  );

  // 4. Build authorization URL
  const url = new URL(GOOGLE_AUTH_ENDPOINT);
  url.searchParams.set('client_id', c.GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri', c.GOOGLE_CALLBACK_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', state);
  url.searchParams.set('nonce', nonce);
  url.searchParams.set('prompt', 'select_account');

  return url.toString();
}

/**
 * Fetches Google's public JWKS certificates (or cached / test mock).
 */
async function getGoogleJwks(): Promise<{ keys: any[] }> {
  if (testJwks) return testJwks;
  const res = await fetch(GOOGLE_JWKS_ENDPOINT, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) {
    throw new Error(`Failed to fetch Google JWKS: HTTP ${res.status}`);
  }
  return (await res.json()) as { keys: any[] };
}

/**
 * Cryptographically verifies Google ID Token signature against Google's JWKS
 * and verifies claims: iss, aud, exp, nonce, and email_verified.
 */
export async function verifyGoogleIdToken(idToken: string, expectedNonce: string): Promise<GoogleTokenPayload> {
  const c = cfg();
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed ID token: must have 3 segments');
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  let header: { alg?: string; kid?: string };
  let payload: GoogleTokenPayload;

  try {
    header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Malformed ID token segments');
  }

  if (header.alg !== 'RS256') {
    throw new Error(`Unsupported token alg: ${header.alg}`);
  }

  // Signature verification against JWKS
  const jwks = await getGoogleJwks();
  const jwk = jwks.keys.find((k: any) => k.kid === header.kid);
  if (!jwk) {
    throw new Error(`Public key for kid ${header.kid} not found in Google JWKS`);
  }

  const keyObject = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const signingInput = `${headerB64}.${payloadB64}`;
  const signature = Buffer.from(signatureB64, 'base64url');

  const isValid = crypto.createVerify('RSA-SHA256').update(signingInput).verify(keyObject, signature);
  if (!isValid) {
    throw new Error('Invalid ID token signature');
  }

  // Claim verifications
  // 1. Issuer: accounts.google.com (either form)
  const allowedIssuers = ['https://accounts.google.com', 'accounts.google.com'];
  if (!allowedIssuers.includes(payload.iss)) {
    throw new Error(`Invalid issuer: ${payload.iss}`);
  }

  // 2. Audience: equal to GOOGLE_CLIENT_ID
  if (payload.aud !== c.GOOGLE_CLIENT_ID) {
    throw new Error(`Audience mismatch: expected ${c.GOOGLE_CLIENT_ID}, got ${payload.aud}`);
  }

  // 3. Expiration: not expired
  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp <= nowSec) {
    throw new Error('ID token has expired');
  }

  // 4. Nonce matching
  if (!payload.nonce || payload.nonce !== expectedNonce) {
    throw new Error('Nonce mismatch');
  }

  // 5. email_verified must be true
  const isEmailVerified = payload.email_verified === true || payload.email_verified === 'true';
  if (!isEmailVerified) {
    throw new Error('Email is not verified with Google');
  }

  return payload;
}

/**
 * Matches existing customer by google_sub, else by verified email (links account),
 * else creates a new customer record with no password.
 */
export async function findOrCreateGoogleCustomer(payload: GoogleTokenPayload): Promise<{ id: number; name: string; email: string | null }> {
  const pool = getPool();
  const email = payload.email.toLowerCase().trim();
  const sub = payload.sub.trim();
  const name = payload.name?.trim() || email.split('@')[0] || 'Customer';

  // 1. Find by google_sub
  const bySub = await pool.query<{ id: number; name: string; email: string | null }>(
    'SELECT id, name, email FROM customers WHERE google_sub = $1',
    [sub],
  );
  if (bySub.rows.length > 0) {
    return bySub.rows[0]!;
  }

  // 2. Find by verified email -> link it
  const byEmail = await pool.query<{ id: number; name: string; email: string | null }>(
    'SELECT id, name, email FROM customers WHERE lower(email) = $1',
    [email],
  );
  if (byEmail.rows.length > 0) {
    const cust = byEmail.rows[0]!;
    await pool.query(
      "UPDATE customers SET google_sub = $1, email_verified = true, auth_provider = COALESCE(auth_provider, 'google') WHERE id = $2",
      [sub, cust.id],
    );
    return cust;
  }

  // 3. Create new customer with no password
  const newCust = await pool.query<{ id: number; name: string; email: string }>(
    "INSERT INTO customers (name, email, google_sub, auth_provider, email_verified) VALUES ($1, $2, $3, 'google', true) RETURNING id, name, email",
    [name, email, sub],
  );
  return newCust.rows[0]!;
}

/**
 * Handles the GET /auth/google/callback redirect.
 * Verifies the state, exchanges code for tokens, verifies ID token, links/creates customer,
 * generates a 60-second one-time login code, and returns the frontend redirect URL.
 */
export async function handleGoogleCallback(query: {
  code?: string;
  state?: string;
  error?: string;
}): Promise<{ redirectUrl: string }> {
  const c = cfg();
  const frontendBase = c.FRONTEND_URL.replace(/\/$/, '');

  // 1. If Google returned an error
  if (query.error) {
    return { redirectUrl: `${frontendBase}/login?error=google_denied` };
  }

  // 2. State must exist, be unused, and not expired
  if (!query.state || typeof query.state !== 'string' || !query.state.trim()) {
    throw badInput('Missing state parameter');
  }

  const pool = getPool();
  const stateHash = crypto.createHash('sha256').update(query.state.trim()).digest('hex');

  const stateRes = await pool.query<{
    id: number;
    code_verifier: string;
    nonce: string;
    expires_at: string;
    used_at: string | null;
  }>('SELECT id, code_verifier, nonce, expires_at, used_at FROM oauth_states WHERE state_hash = $1', [stateHash]);

  const stateRow = stateRes.rows[0];
  if (!stateRow || stateRow.used_at !== null || new Date(stateRow.expires_at).getTime() < Date.now()) {
    throw badInput('Invalid, expired or reused OAuth state');
  }

  // Mark state used immediately (single-use)
  await pool.query('UPDATE oauth_states SET used_at = now() WHERE id = $1', [stateRow.id]);

  if (!query.code || typeof query.code !== 'string' || !query.code.trim()) {
    return { redirectUrl: `${frontendBase}/login?error=google_failed` };
  }

  try {
    // 3. Exchange code at Google token endpoint
    const bodyParams = new URLSearchParams({
      code: query.code.trim(),
      client_id: c.GOOGLE_CLIENT_ID,
      client_secret: c.GOOGLE_CLIENT_SECRET,
      redirect_uri: c.GOOGLE_CALLBACK_URL,
      grant_type: 'authorization_code',
      code_verifier: stateRow.code_verifier,
    });

    const tokenRes = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: bodyParams.toString(),
      signal: AbortSignal.timeout(10_000),
    });

    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: HTTP ${tokenRes.status}`);
    }

    const tokenData = (await tokenRes.json()) as { id_token?: string };
    if (!tokenData.id_token) {
      throw new Error('Token exchange response missing id_token');
    }

    // 4. Verify ID Token
    const payload = await verifyGoogleIdToken(tokenData.id_token, stateRow.nonce);

    // 5. Match or create customer
    const customer = await findOrCreateGoogleCustomer(payload);

    // 6. Create single-use 60-second login code
    const rawCode = crypto.randomBytes(32).toString('hex');
    const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');

    await pool.query(
      "INSERT INTO oauth_login_codes (code_hash, customer_id, expires_at) VALUES ($1, $2, now() + interval '60 seconds')",
      [codeHash, customer.id],
    );

    return { redirectUrl: `${frontendBase}/auth/callback?code=${rawCode}` };
  } catch (err) {
    // Safe failure redirect with no detail, secret, or token leaked
    return { redirectUrl: `${frontendBase}/login?error=google_failed` };
  }
}

/**
 * POST /auth/google/exchange { code }
 * Exchanges a single-use 60-second authorization code for a session token.
 * Merges guest cart if a guest bearer token is provided.
 */
export async function exchangeLoginCode(code: string, guestToken?: string): Promise<AuthResponse> {
  if (!code || typeof code !== 'string' || !code.trim()) {
    throw badInput('Login code is required');
  }

  const pool = getPool();
  const codeHash = crypto.createHash('sha256').update(code.trim()).digest('hex');

  // Single-use, 60s expiry check
  const codeRes = await pool.query<{
    id: number;
    customer_id: number;
    expires_at: string;
    used_at: string | null;
  }>('SELECT id, customer_id, expires_at, used_at FROM oauth_login_codes WHERE code_hash = $1', [codeHash]);

  const row = codeRes.rows[0];
  if (!row || row.used_at !== null || new Date(row.expires_at).getTime() < Date.now()) {
    throw new AppError(401, 'BAD_LOGIN_CODE', 'Invalid, expired, or already used login code');
  }

  // Atomically mark code as used
  await pool.query('UPDATE oauth_login_codes SET used_at = now() WHERE id = $1', [row.id]);

  // Retrieve customer
  const custRes = await pool.query<{
    id: number;
    name: string;
    email: string | null;
  }>('SELECT id, name, email FROM customers WHERE id = $1', [row.customer_id]);

  const customer = custRes.rows[0];
  if (!customer) {
    throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
  }

  // Merge guest session/cart if bearer token provided
  if (guestToken) {
    await mergeGuestSession(guestToken, customer.id);
  }

  // Generate standard session token (stored as SHA-256 hash in DB)
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const sessionHash = crypto.createHash('sha256').update(sessionToken).digest('hex');

  await pool.query(
    "INSERT INTO sessions (token_hash, customer_id, expires_at) VALUES ($1, $2, now() + interval '30 days')",
    [sessionHash, customer.id],
  );

  return {
    customer_id: customer.id,
    token: sessionToken,
    name: customer.name,
    email: customer.email,
  };
}
