-- 007_plant_images.sql: Additive schema for licensed plant images and metadata

-- 1. Add image metadata columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_path text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_source_url text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_author text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_license text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_status text DEFAULT 'missing';

CREATE INDEX IF NOT EXISTS idx_products_image_status ON products (image_status);

-- 2. Add image metadata columns to plant_attributes table
ALTER TABLE plant_attributes ADD COLUMN IF NOT EXISTS image_path text;
ALTER TABLE plant_attributes ADD COLUMN IF NOT EXISTS image_source_url text;
ALTER TABLE plant_attributes ADD COLUMN IF NOT EXISTS image_author text;
ALTER TABLE plant_attributes ADD COLUMN IF NOT EXISTS image_license text;
ALTER TABLE plant_attributes ADD COLUMN IF NOT EXISTS image_status text DEFAULT 'missing';

CREATE INDEX IF NOT EXISTS idx_plant_attributes_image_status ON plant_attributes (image_status);
