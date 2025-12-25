-- Fix script: Ensure id column has default UUID generation
-- Run this if you get "null value in column id" error

-- Ensure id column has default UUID generation
ALTER TABLE "zo-users" ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Verify the default is set (this will show the column definition)
-- You can check in Supabase table editor that id column shows "gen_random_uuid()" as default

