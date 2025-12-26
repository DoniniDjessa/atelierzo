-- Supabase Database Schema for Preorders
-- All tables are prefixed with 'zo-'

-- Preorders table
CREATE TABLE IF NOT EXISTS "zo-preorders" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "zo-users"(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  size TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'fulfilled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE "zo-preorders" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public insert preorders" ON "zo-preorders";
DROP POLICY IF EXISTS "Allow public read preorders" ON "zo-preorders";
DROP POLICY IF EXISTS "Allow public update preorders" ON "zo-preorders";

-- Policy: Allow public to insert preorders
CREATE POLICY "Allow public insert preorders"
  ON "zo-preorders"
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow public to read preorders
CREATE POLICY "Allow public read preorders"
  ON "zo-preorders"
  FOR SELECT
  USING (true);

-- Policy: Allow public to update preorders
CREATE POLICY "Allow public update preorders"
  ON "zo-preorders"
  FOR UPDATE
  USING (true);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS "zo-preorders_user_id_idx" ON "zo-preorders"(user_id);
CREATE INDEX IF NOT EXISTS "zo-preorders_product_id_idx" ON "zo-preorders"(product_id);
CREATE INDEX IF NOT EXISTS "zo-preorders_status_idx" ON "zo-preorders"(status);
CREATE INDEX IF NOT EXISTS "zo-preorders_created_at_idx" ON "zo-preorders"(created_at DESC);

-- Trigger to automatically update updated_at timestamp for preorders
DROP TRIGGER IF EXISTS update_zo_preorders_updated_at ON "zo-preorders";
CREATE TRIGGER update_zo_preorders_updated_at 
  BEFORE UPDATE ON "zo-preorders"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

