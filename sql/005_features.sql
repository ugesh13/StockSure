-- 005_features.sql: Accounts, Payments, Delivery, and Customer Features

-- 1. Accounts / Auth
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS password_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS customers_email_lower_idx ON customers (lower(email)) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id serial PRIMARY KEY,
  token_hash text NOT NULL,
  customer_id integer NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens (token_hash);

-- 2. Payments
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'PENDING';

CREATE TABLE IF NOT EXISTS payments (
  id text PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_order_id text,
  provider_payment_id text,
  amount_paise integer NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL, -- CREATED, AUTHORIZED, CAPTURED, FAILED, REFUNDED
  method text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_payments_provider_payment_id UNIQUE (provider, provider_payment_id)
);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments (order_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_order_id ON payments (provider_order_id);

CREATE TABLE IF NOT EXISTS payment_events (
  provider_event_id text PRIMARY KEY,
  type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL
);

-- 3. Deliveries
CREATE TABLE IF NOT EXISTS deliveries (
  id serial PRIMARY KEY,
  order_id uuid NOT NULL UNIQUE REFERENCES orders (id) ON DELETE CASCADE,
  branch_id integer NOT NULL REFERENCES branches (id),
  address jsonb NOT NULL,
  distance_km numeric(6, 2) NOT NULL,
  fee_paise integer NOT NULL,
  status text NOT NULL, -- PENDING_PAYMENT, CONFIRMED, PACKED, OUT_FOR_DELIVERY, DELIVERED, FAILED_ATTEMPT, CANCELLED, RETURNED
  handover_code_hash text,
  rider_name text,
  rider_phone text,
  rider_lat numeric(9, 6),
  rider_lng numeric(9, 6),
  rider_updated_at timestamptz,
  eta_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS delivery_events (
  id serial PRIMARY KEY,
  delivery_id integer NOT NULL REFERENCES deliveries (id) ON DELETE CASCADE,
  status text NOT NULL,
  at timestamptz NOT NULL DEFAULT now(),
  note text
);

CREATE TABLE IF NOT EXISTS order_issues (
  id serial PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  customer_id integer NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  reason text NOT NULL, -- DAMAGED, WRONG_PLANT, DEAD_ON_ARRIVAL, NOT_DELIVERED
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
