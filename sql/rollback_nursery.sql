-- Rollback Nursery Pivot:
-- Sets nursery rows is_active = false and legacy rows is_active = true.
-- Does NOT delete any data.
UPDATE products
   SET is_active = false
 WHERE is_nursery = true;

UPDATE products
   SET is_active = true
 WHERE is_nursery = false;
