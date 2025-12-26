-- Update products schema to add new category 'tshirt-oversize-civ'

-- Drop the existing check constraint
ALTER TABLE "zo-products" DROP CONSTRAINT IF EXISTS "zo-products_category_check";

-- Add new check constraint with the new category
ALTER TABLE "zo-products" ADD CONSTRAINT "zo-products_category_check" 
  CHECK (category IN ('bermuda', 'pantalon', 'tshirt-oversize-civ'));

