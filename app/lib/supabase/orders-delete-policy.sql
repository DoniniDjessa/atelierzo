-- Add soft delete support to orders table
-- Instead of hard deleting orders, we mark them as deleted with is_deleted boolean

-- Add is_deleted column if it doesn't exist
ALTER TABLE "zo-orders" 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Create index for faster queries filtering deleted orders
CREATE INDEX IF NOT EXISTS "zo-orders_is_deleted_idx" ON "zo-orders"(is_deleted);

-- Note: No need for DELETE policies since we're using soft deletes (UPDATE)
-- The existing UPDATE policy "Allow public update orders" handles marking orders as deleted
