-- Add pickup_number field to orders table
-- This field will store the client's pickup/recovery number

-- Add pickup_number column
ALTER TABLE "zo-orders" 
ADD COLUMN IF NOT EXISTS pickup_number TEXT;

-- Create index for faster queries filtering by pickup number
CREATE INDEX IF NOT EXISTS "zo-orders_pickup_number_idx" ON "zo-orders"(pickup_number);

-- Note: This field is required on the frontend but optional in the database for backward compatibility


