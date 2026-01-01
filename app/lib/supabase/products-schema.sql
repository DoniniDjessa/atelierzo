-- Supabase Database Schema for Products (zo-products table)
-- Table for storing product information

-- Drop table if exists (uncomment if needed for clean start)
-- DROP TABLE IF EXISTS "zo-products" CASCADE;

-- Products table
CREATE TABLE IF NOT EXISTS "zo-products" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  old_price DECIMAL(10, 2),
  image_url TEXT NOT NULL,
  colors TEXT[], -- Array of color hex codes
  sizes JSONB NOT NULL DEFAULT '{"M": 0, "L": 0, "XL": 0, "2XL": 0, "3XL": 0, "4XL": 0, "5XL": 0}'::jsonb, -- Object with size as key and quantity as value, e.g. {"M": 5, "L": 0, "XL": 10}
  in_stock BOOLEAN DEFAULT false, -- Global stock status - true if any size has quantity > 0
  category TEXT NOT NULL CHECK (category IN ('bermuda', 'pantalon', 'tshirt-oversize-civ')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on category for faster filtering
CREATE INDEX IF NOT EXISTS "zo-products_category_idx" ON "zo-products"(category);

-- Create index on in_stock for faster filtering
CREATE INDEX IF NOT EXISTS "zo-products_in_stock_idx" ON "zo-products"(in_stock);

-- Enable Row Level Security (RLS)
ALTER TABLE "zo-products" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read" ON "zo-products";
DROP POLICY IF EXISTS "Allow authenticated insert" ON "zo-products";
DROP POLICY IF EXISTS "Allow authenticated update" ON "zo-products";
DROP POLICY IF EXISTS "Allow authenticated delete" ON "zo-products";

-- Policy: Allow public to read products
CREATE POLICY "Allow public read" ON "zo-products"
  FOR SELECT
  USING (true);

-- Policy: Allow authenticated users to insert products (for admin panel)
-- Note: In production, you might want to restrict this to admin users only
CREATE POLICY "Allow authenticated insert" ON "zo-products"
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow authenticated users to update products
CREATE POLICY "Allow authenticated update" ON "zo-products"
  FOR UPDATE
  USING (true);

-- Policy: Allow authenticated users to delete products
CREATE POLICY "Allow authenticated delete" ON "zo-products"
  FOR DELETE
  USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_zo_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_zo_products_updated_at ON "zo-products";

-- Create trigger to update updated_at on row update
CREATE TRIGGER update_zo_products_updated_at
  BEFORE UPDATE ON "zo-products"
  FOR EACH ROW
  EXECUTE FUNCTION update_zo_products_updated_at();

