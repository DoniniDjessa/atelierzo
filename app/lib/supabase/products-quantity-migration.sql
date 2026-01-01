-- Revert to quantity-based inventory system
-- This migration converts the sizes field from availability (boolean) back to quantities (numbers)

-- Update existing products to use quantity-based system
-- Default all sizes to quantity 0 (admin will set actual stock)
UPDATE "zo-products"
SET sizes = (
  SELECT jsonb_object_agg(
    key,
    '0'::jsonb
  )
  FROM jsonb_each(sizes)
)
WHERE sizes IS NOT NULL;

-- Update the default value for new products
ALTER TABLE "zo-products" 
ALTER COLUMN sizes SET DEFAULT '{"M": 0, "L": 0, "XL": 0, "2XL": 0, "3XL": 0, "4XL": 0, "5XL": 0}'::jsonb;

-- The table structure remains JSONB, so no column type changes needed
-- Stock status logic will be handled in application code:
-- - If all sizes have qty = 0, product is "rupture"
-- - Otherwise, product is "stock" or "preorder"
