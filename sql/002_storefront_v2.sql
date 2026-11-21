-- Migration 002: Storefront V2 updates
-- Idempotent schema updates between 001 baseline and 003 V3 additions

-- 1. Orders fulfilment constraint allowing PICKUP, DELIVERY, IN_STORE and optional branch_id
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_fulfilment_check;
ALTER TABLE orders ADD CONSTRAINT orders_fulfilment_check CHECK (fulfilment IN ('PICKUP', 'DELIVERY', 'IN_STORE'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS branch_id integer REFERENCES branches(id);
CREATE INDEX IF NOT EXISTS orders_branch_idx ON orders (branch_id);

-- 2. Customers email nullable for guest checkout sessions
ALTER TABLE customers ALTER COLUMN email DROP NOT NULL;
