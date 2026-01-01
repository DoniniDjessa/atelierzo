-- Migration: Convert from quantity-based to availability-based inventory
-- This script converts the sizes field from quantity tracking to availability tracking

-- Step 1: Convert existing quantity-based sizes to availability-based
-- If a size has qty > 0, mark it as available (true), otherwise unavailable (false)
UPDATE "zo-products"
SET sizes = (
  SELECT jsonb_object_agg(
    key,
    CASE 
      WHEN value::int > 0 THEN 'true'::jsonb
      ELSE 'false'::jsonb
    END
  )
  FROM jsonb_each_text(sizes)
)
WHERE jsonb_typeof(sizes) = 'object' AND sizes != '{}'::jsonb;

-- Step 2: For products with no sizes defined, set default available sizes
UPDATE "zo-products"
SET sizes = '{"M": true, "L": true, "XL": true, "2XL": true, "3XL": true, "4XL": true, "5XL": true}'::jsonb
WHERE sizes = '{}'::jsonb OR sizes IS NULL;

-- Step 3: Update in_stock status based on available sizes
-- Product is in stock if at least one size is available
UPDATE "zo-products"
SET in_stock = (
  SELECT bool_or(value::boolean)
  FROM jsonb_each_text(sizes)
  WHERE value::boolean = true
);

-- Verification queries (optional - run these to check the migration)
-- SELECT id, title, sizes, in_stock FROM "zo-products" LIMIT 10;
