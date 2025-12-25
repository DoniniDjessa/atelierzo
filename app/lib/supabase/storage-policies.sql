-- Supabase Storage Policies for zo-bucket
-- This script creates the bucket (if it doesn't exist) and sets up the necessary RLS policies
-- Run this script in your Supabase SQL Editor

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('zo-bucket', 'zo-bucket', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Make sure the bucket is public (if it already existed)
UPDATE storage.buckets 
SET public = true 
WHERE id = 'zo-bucket';

-- Drop existing policies if they exist (for zo-bucket specifically)
DROP POLICY IF EXISTS "Allow public uploads zo-bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read zo-bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete zo-bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update zo-bucket" ON storage.objects;

-- Policy: Allow anyone (public) to upload files to zo-bucket
CREATE POLICY "Allow public uploads zo-bucket"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'zo-bucket');

-- Policy: Allow anyone (public) to read files from zo-bucket
CREATE POLICY "Allow public read zo-bucket"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'zo-bucket');

-- Policy: Allow anyone (public) to delete files from zo-bucket
CREATE POLICY "Allow public delete zo-bucket"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'zo-bucket');

-- Policy: Allow anyone (public) to update files in zo-bucket (optional, for updates)
CREATE POLICY "Allow public update zo-bucket"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'zo-bucket');
