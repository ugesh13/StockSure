-- Migration 004: Nursery Pivot Schema Additions
-- Adds plant attributes, is_active flag, variant metadata, and indexes. Fully idempotent.

-- 1. Add is_active flag and nursery columns directly to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS scientific_name text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS name_hi text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS name_kn text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS aliases text[] NOT NULL DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS plant_common_name text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS variant_group text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS variant_size text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_nursery boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS products_is_active_idx ON products (is_active);
CREATE INDEX IF NOT EXISTS products_is_nursery_idx ON products (is_nursery);
CREATE INDEX IF NOT EXISTS products_plant_common_idx ON products (plant_common_name);

-- 2. Plant attributes table keyed to product_id
CREATE TABLE IF NOT EXISTS plant_attributes (
  product_id      integer PRIMARY KEY REFERENCES products (id) ON DELETE CASCADE,
  scientific_name text,
  name_hi         text,
  name_kn         text,
  category        text NOT NULL,
  aliases         text[] NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS plant_attributes_category_idx ON plant_attributes (category);
