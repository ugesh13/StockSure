-- Migration 003: Storefront V3 additions
-- Add lat/lng to branches, price_flag/source_url/checked_on to products,
-- shelf_locations with 1-5 levels, sessions, product_requests, and cart_codes.

-- 1. Branches lat/lng
ALTER TABLE branches ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS lng double precision;

-- 2. Products verified price fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_flag text NOT NULL DEFAULT 'i' CHECK (price_flag IN ('v', 'i'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS checked_on date;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_price_flag_check;
ALTER TABLE products ADD CONSTRAINT products_price_flag_check CHECK (price_flag = 'i' OR (price_flag = 'v' AND source_url IS NOT NULL AND checked_on IS NOT NULL));

-- 3. Shelf locations table with levels 1 to 5
CREATE TABLE IF NOT EXISTS shelf_locations (
  branch_id  integer NOT NULL REFERENCES branches (id) ON DELETE CASCADE,
  product_id integer NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  aisle      text    NOT NULL,
  bay        integer NOT NULL CHECK (bay >= 1),
  level      integer NOT NULL,
  slot       integer NOT NULL CHECK (slot IN (1, 2)),
  x          double precision NOT NULL,
  y          double precision NOT NULL,
  z          double precision NOT NULL,
  stand_x    double precision NOT NULL,
  stand_z    double precision NOT NULL,
  PRIMARY KEY (branch_id, product_id)
);

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'shelf_locations'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%level%'
  ) LOOP
    EXECUTE 'ALTER TABLE shelf_locations DROP CONSTRAINT ' || quote_ident(r.conname);
  END LOOP;
END $$;

ALTER TABLE shelf_locations ADD CONSTRAINT shelf_locations_level_check CHECK (level BETWEEN 1 AND 5);
CREATE INDEX IF NOT EXISTS shelf_locations_product_idx ON shelf_locations (product_id);
CREATE INDEX IF NOT EXISTS shelf_locations_branch_idx ON shelf_locations (branch_id);
CREATE INDEX IF NOT EXISTS shelf_locations_aisle_idx ON shelf_locations (branch_id, aisle);

-- 4. Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id           bigserial PRIMARY KEY,
  customer_id  integer NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  token_hash   text NOT NULL UNIQUE,
  name         text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);
CREATE INDEX IF NOT EXISTS sessions_customer_idx ON sessions (customer_id);
CREATE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions (token_hash);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions (expires_at);

-- 5. Product requests table
CREATE TABLE IF NOT EXISTS product_requests (
  id         serial PRIMARY KEY,
  query      text NOT NULL,
  normalized text NOT NULL UNIQUE,
  count      integer NOT NULL DEFAULT 1 CHECK (count >= 1),
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS product_requests_normalized_idx ON product_requests (normalized);

-- 6. Cart codes for kiosk
CREATE TABLE IF NOT EXISTS cart_codes (
  code        text PRIMARY KEY,
  customer_id integer NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS cart_codes_customer_idx ON cart_codes (customer_id);
CREATE INDEX IF NOT EXISTS cart_codes_expires_idx ON cart_codes (expires_at);

-- 7. Orders IN_STORE support and optional branch_id
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_fulfilment_check;
ALTER TABLE orders ADD CONSTRAINT orders_fulfilment_check CHECK (fulfilment IN ('PICKUP', 'DELIVERY', 'IN_STORE'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS branch_id integer REFERENCES branches(id);
CREATE INDEX IF NOT EXISTS orders_branch_idx ON orders (branch_id);

-- 8. Customers email nullable for guest checkout sessions
ALTER TABLE customers ALTER COLUMN email DROP NOT NULL;
