-- 006_google_auth.sql: Google OAuth Sign-in Support (Additive & Idempotent)

-- 1. Add Google OAuth columns to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS google_sub text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS auth_provider text DEFAULT 'password';
ALTER TABLE customers ALTER COLUMN password_hash DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS customers_google_sub_idx ON customers (google_sub) WHERE google_sub IS NOT NULL;

-- 2. Provide users view aliasing customers for schema compatibility
CREATE OR REPLACE VIEW users AS SELECT * FROM customers;

-- 3. Table oauth_states: stores PKCE verifier, nonce and state hash with 10-minute TTL
CREATE TABLE IF NOT EXISTS oauth_states (
  id serial PRIMARY KEY,
  state_hash text NOT NULL UNIQUE,
  code_verifier text NOT NULL,
  nonce text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_oauth_states_hash ON oauth_states (state_hash);

-- 4. Table oauth_login_codes: one-time 60-second authorization code for frontend exchange
CREATE TABLE IF NOT EXISTS oauth_login_codes (
  id serial PRIMARY KEY,
  code_hash text NOT NULL UNIQUE,
  customer_id integer NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_oauth_login_codes_hash ON oauth_login_codes (code_hash);
