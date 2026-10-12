-- Enable color-specific images and size inventory for unicolor garments.
ALTER TABLE "zo-products"
  ADD COLUMN IF NOT EXISTS color_variants JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS "zo-products_color_variants_idx"
  ON "zo-products" USING GIN (color_variants);

INSERT INTO "zo-categories" (
  slug,
  name,
  description,
  sort_order,
  is_active,
  show_on_home,
  home_limit
)
SELECT
  'vetements-unicolores',
  'TEXTILES SANS IMPRESSION',
  'Choisissez votre couleur puis les tailles disponibles.',
  COALESCE(MAX(sort_order), 0) + 1,
  TRUE,
  TRUE,
  4
FROM "zo-categories"
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name;
