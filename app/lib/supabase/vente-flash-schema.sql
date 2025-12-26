-- Vente Flash Schema
-- Table to store flash sale campaigns

CREATE TABLE IF NOT EXISTS "zo-vente-flash" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  global_discount_percentage INTEGER DEFAULT 0, -- Global discount percentage (0-100)
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table to store products in a flash sale with individual discounts
CREATE TABLE IF NOT EXISTS "zo-vente-flash-products" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vente_flash_id UUID NOT NULL REFERENCES "zo-vente-flash"(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL, -- References product ID from ProductContext
  discount_percentage INTEGER DEFAULT 0, -- Individual discount percentage (0-100)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vente_flash_id, product_id)
);

-- Enable Row Level Security
ALTER TABLE "zo-vente-flash" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "zo-vente-flash-products" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read active flash sales" ON "zo-vente-flash";
DROP POLICY IF EXISTS "Allow public read flash sale products" ON "zo-vente-flash-products";
DROP POLICY IF EXISTS "Allow authenticated insert flash sales" ON "zo-vente-flash";
DROP POLICY IF EXISTS "Allow authenticated update flash sales" ON "zo-vente-flash";
DROP POLICY IF EXISTS "Allow authenticated delete flash sales" ON "zo-vente-flash";
DROP POLICY IF EXISTS "Allow authenticated insert flash sale products" ON "zo-vente-flash-products";
DROP POLICY IF EXISTS "Allow authenticated update flash sale products" ON "zo-vente-flash-products";
DROP POLICY IF EXISTS "Allow authenticated delete flash sale products" ON "zo-vente-flash-products";

-- Policies for zo-vente-flash
CREATE POLICY "Allow public read active flash sales" ON "zo-vente-flash"
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated insert flash sales" ON "zo-vente-flash"
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update flash sales" ON "zo-vente-flash"
  FOR UPDATE
  USING (true);

CREATE POLICY "Allow authenticated delete flash sales" ON "zo-vente-flash"
  FOR DELETE
  USING (true);

-- Policies for zo-vente-flash-products
CREATE POLICY "Allow public read flash sale products" ON "zo-vente-flash-products"
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated insert flash sale products" ON "zo-vente-flash-products"
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update flash sale products" ON "zo-vente-flash-products"
  FOR UPDATE
  USING (true);

CREATE POLICY "Allow authenticated delete flash sale products" ON "zo-vente-flash-products"
  FOR DELETE
  USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS "zo-vente-flash_active_idx" ON "zo-vente-flash"(is_active);
CREATE INDEX IF NOT EXISTS "zo-vente-flash_dates_idx" ON "zo-vente-flash"(start_date, end_date);
CREATE INDEX IF NOT EXISTS "zo-vente-flash-products_vente_flash_id_idx" ON "zo-vente-flash-products"(vente_flash_id);
CREATE INDEX IF NOT EXISTS "zo-vente-flash-products_product_id_idx" ON "zo-vente-flash-products"(product_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_zo_vente_flash_updated_at ON "zo-vente-flash";
CREATE TRIGGER update_zo_vente_flash_updated_at
  BEFORE UPDATE ON "zo-vente-flash"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

