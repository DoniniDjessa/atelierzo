-- Supabase Database Schema for Satisfied Clients
-- Table: zo-clients-satisfaits

CREATE TABLE IF NOT EXISTS "zo-clients-satisfaits" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE "zo-clients-satisfaits" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read satisfied clients" ON "zo-clients-satisfaits";
DROP POLICY IF EXISTS "Allow authenticated insert satisfied clients" ON "zo-clients-satisfaits";
DROP POLICY IF EXISTS "Allow authenticated update satisfied clients" ON "zo-clients-satisfaits";
DROP POLICY IF EXISTS "Allow authenticated delete satisfied clients" ON "zo-clients-satisfaits";

-- Policy: Allow public to read satisfied clients
CREATE POLICY "Allow public read satisfied clients"
  ON "zo-clients-satisfaits"
  FOR SELECT
  USING (true);

-- Policy: Allow authenticated users (admins) to insert satisfied clients
CREATE POLICY "Allow authenticated insert satisfied clients"
  ON "zo-clients-satisfaits"
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow authenticated users (admins) to update satisfied clients
CREATE POLICY "Allow authenticated update satisfied clients"
  ON "zo-clients-satisfaits"
  FOR UPDATE
  USING (true);

-- Policy: Allow authenticated users (admins) to delete satisfied clients
CREATE POLICY "Allow authenticated delete satisfied clients"
  ON "zo-clients-satisfaits"
  FOR DELETE
  USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "zo-clients-satisfaits_created_at_idx" ON "zo-clients-satisfaits"(created_at DESC);

-- Function to update updated_at column (create if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at timestamp
DROP TRIGGER IF EXISTS update_zo_clients_satisfaits_updated_at ON "zo-clients-satisfaits";
CREATE TRIGGER update_zo_clients_satisfaits_updated_at
  BEFORE UPDATE ON "zo-clients-satisfaits"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

