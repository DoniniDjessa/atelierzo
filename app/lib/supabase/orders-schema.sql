-- Supabase Database Schema for Orders
-- All tables are prefixed with 'zo-'

-- Orders table
CREATE TABLE IF NOT EXISTS "zo-orders" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "zo-users"(id) ON DELETE CASCADE,
  total_amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  shipping_address TEXT,
  shipping_phone TEXT,
  notes TEXT,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order items table (products in an order)
CREATE TABLE IF NOT EXISTS "zo-order-items" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES "zo-orders"(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL, -- Reference to product ID (could be UUID or string)
  title TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT NOT NULL,
  size TEXT NOT NULL,
  color TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE "zo-orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "zo-order-items" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public insert orders" ON "zo-orders";
DROP POLICY IF EXISTS "Allow public read orders" ON "zo-orders";
DROP POLICY IF EXISTS "Allow public update orders" ON "zo-orders";
DROP POLICY IF EXISTS "Allow public insert order-items" ON "zo-order-items";
DROP POLICY IF EXISTS "Allow public read order-items" ON "zo-order-items";

-- Policy: Allow public to insert orders (for checkout)
CREATE POLICY "Allow public insert orders"
  ON "zo-orders"
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow public to read orders (users can see their own orders)
CREATE POLICY "Allow public read orders"
  ON "zo-orders"
  FOR SELECT
  USING (true);

-- Policy: Allow public to update orders (for status updates and soft delete)
CREATE POLICY "Allow public update orders"
  ON "zo-orders"
  FOR UPDATE
  USING (true);

-- Policy: Allow public to insert order items
CREATE POLICY "Allow public insert order-items"
  ON "zo-order-items"
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow public to read order items
CREATE POLICY "Allow public read order-items"
  ON "zo-order-items"
  FOR SELECT
  USING (true);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS "zo-orders_user_id_idx" ON "zo-orders"(user_id);
CREATE INDEX IF NOT EXISTS "zo-orders_status_idx" ON "zo-orders"(status);
CREATE INDEX IF NOT EXISTS "zo-orders_is_deleted_idx" ON "zo-orders"(is_deleted);
CREATE INDEX IF NOT EXISTS "zo-orders_created_at_idx" ON "zo-orders"(created_at DESC);
CREATE INDEX IF NOT EXISTS "zo-order-items_order_id_idx" ON "zo-order-items"(order_id);
CREATE INDEX IF NOT EXISTS "zo-order-items_product_id_idx" ON "zo-order-items"(product_id);

-- Trigger to automatically update updated_at timestamp for orders
DROP TRIGGER IF EXISTS update_zo_orders_updated_at ON "zo-orders";
CREATE TRIGGER update_zo_orders_updated_at 
  BEFORE UPDATE ON "zo-orders"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

