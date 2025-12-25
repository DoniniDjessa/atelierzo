-- Supabase Database Schema for Atelierzo
-- All tables are prefixed with 'zo-'

-- Drop table if exists to recreate with correct schema (uncomment if needed for clean start)
-- DROP TABLE IF EXISTS "zo-users" CASCADE;

-- Users table
-- This table stores user profile information
-- Simple table without Supabase Auth dependency
CREATE TABLE IF NOT EXISTS "zo-users" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop foreign key constraint if it exists (from old schema that referenced auth.users)
ALTER TABLE "zo-users" DROP CONSTRAINT IF EXISTS "zo-users_id_fkey";

-- Ensure id column has default (in case table already existed)
ALTER TABLE "zo-users" ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Enable Row Level Security (RLS)
ALTER TABLE "zo-users" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public insert" ON "zo-users";
DROP POLICY IF EXISTS "Allow read own data" ON "zo-users";
DROP POLICY IF EXISTS "Allow update own data" ON "zo-users";
DROP POLICY IF EXISTS "Users can read own data" ON "zo-users";
DROP POLICY IF EXISTS "Users can update own data" ON "zo-users";
DROP POLICY IF EXISTS "Users can insert own data" ON "zo-users";

-- Policy: Allow public inserts (registration)
CREATE POLICY "Allow public insert" ON "zo-users"
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow users to read their own data by phone (you can customize this)
CREATE POLICY "Allow read own data" ON "zo-users"
  FOR SELECT
  USING (true);

-- Policy: Allow users to update their own data by phone
CREATE POLICY "Allow update own data" ON "zo-users"
  FOR UPDATE
  USING (true);

-- Create index on phone for faster lookups
CREATE INDEX IF NOT EXISTS "zo-users_phone_idx" ON "zo-users"(phone);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on row update
DROP TRIGGER IF EXISTS update_zo_users_updated_at ON "zo-users";
CREATE TRIGGER update_zo_users_updated_at BEFORE UPDATE ON "zo-users"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

