-- Fix script: Remove foreign key constraint from zo-users table
-- Run this if you get "violates foreign key constraint zo-users_id_fkey" error

-- Drop the foreign key constraint that references auth.users
ALTER TABLE "zo-users" DROP CONSTRAINT IF EXISTS "zo-users_id_fkey";

-- Ensure id column has default UUID generation
ALTER TABLE "zo-users" ALTER COLUMN id SET DEFAULT gen_random_uuid();

