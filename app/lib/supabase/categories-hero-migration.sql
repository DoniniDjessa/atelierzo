-- Categories (with sub-categories) and hero carousel slides, managed from /pilotage.
-- Run once in the Supabase SQL editor. Safe to re-run: nothing existing is deleted.

-- ==========================================
-- 1. Categories: zo-categories
--    A row with parent_id = NULL is a category, a row with a parent_id is one of its sub-categories.
--    Products keep referencing categories by slug ("zo-products".category / .subcategory),
--    so the slug never changes once created (only the name/description are edited).
-- ==========================================
CREATE TABLE IF NOT EXISTS "zo-categories" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES "zo-categories"(id) ON DELETE RESTRICT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  show_on_home BOOLEAN NOT NULL DEFAULT TRUE,
  home_limit INTEGER NOT NULL DEFAULT 4,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "zo-categories_parent_idx" ON "zo-categories"(parent_id);

-- Current categories (labels and texts as they appear on the site today)
INSERT INTO "zo-categories" (slug, name, description, sort_order, home_limit) VALUES
  ('bermuda', 'T-SHIRTS OVERSIZES IMPRIMES', 'Découvrez nos ensembles élégants pour un style décontracté et moderne', 1, 4),
  ('tshirt-oversize-civ', 'Tshirt Oversize CIV Champions d''Afrique', 'Célébrez la victoire avec style', 2, 12),
  ('pantalon', 'Chemise Pantalon', NULL, 3, 4)
ON CONFLICT (slug) DO NOTHING;

-- ==========================================
-- 2. Products: free category list + optional sub-category
-- ==========================================
-- The old CHECK only allowed the 3 hard-coded categories
ALTER TABLE "zo-products" DROP CONSTRAINT IF EXISTS "zo-products_category_check";
ALTER TABLE "zo-products" ADD COLUMN IF NOT EXISTS subcategory TEXT;
CREATE INDEX IF NOT EXISTS "zo-products_subcategory_idx" ON "zo-products"(subcategory);

-- ==========================================
-- 3. Hero carousel: zo-hero-slides
--    One set of portrait pictures (3:4): 1 visible on phones, 2 on tablets, 3-4 on large screens
-- ==========================================
CREATE TABLE IF NOT EXISTS "zo-hero-slides" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  link_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Databases created with the first version of this file also have a "device" column
-- (mobile/desktop): it is no longer used and can stay.

-- Current pictures, only when the table is still empty
INSERT INTO "zo-hero-slides" (image_url, sort_order)
SELECT v.image_url, v.sort_order
FROM (VALUES
  ('/carousel/1.jpeg', 1),
  ('/carousel/2.jpeg', 2),
  ('/carousel/3.jpeg', 3),
  ('/carousel/4.jpeg', 4),
  ('/carousel/5.jpeg', 5),
  ('/carousel/6.jpeg', 6),
  ('/carousel/7.jpeg', 7),
  ('/carousel/8.jpeg', 8)
) AS v(image_url, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM "zo-hero-slides");

-- ==========================================
-- 4. RLS (same model as the other zo-* tables: public read, writes from the admin app)
-- ==========================================
ALTER TABLE "zo-categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "zo-hero-slides" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read categories" ON "zo-categories";
DROP POLICY IF EXISTS "Allow admin write categories" ON "zo-categories";
CREATE POLICY "Allow public read categories" ON "zo-categories" FOR SELECT USING (true);
CREATE POLICY "Allow admin write categories" ON "zo-categories" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read hero slides" ON "zo-hero-slides";
DROP POLICY IF EXISTS "Allow admin write hero slides" ON "zo-hero-slides";
CREATE POLICY "Allow public read hero slides" ON "zo-hero-slides" FOR SELECT USING (true);
CREATE POLICY "Allow admin write hero slides" ON "zo-hero-slides" FOR ALL USING (true) WITH CHECK (true);

-- updated_at triggers (function already exists from the other schemas; recreated to be safe)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_zo_categories_updated_at ON "zo-categories";
CREATE TRIGGER update_zo_categories_updated_at
  BEFORE UPDATE ON "zo-categories"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_zo_hero_slides_updated_at ON "zo-hero-slides";
CREATE TRIGGER update_zo_hero_slides_updated_at
  BEFORE UPDATE ON "zo-hero-slides"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
