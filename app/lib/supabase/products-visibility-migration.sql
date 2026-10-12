-- Add storefront visibility controls to products.
-- Existing products remain visible; newly created products default to visible.
ALTER TABLE "zo-products"
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "zo-products_is_visible_idx"
  ON "zo-products"(is_visible);
