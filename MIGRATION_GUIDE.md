# Migration Guide: Quantity-Based to Availability-Based Inventory

## Overview
The inventory system has been migrated from quantity-based tracking to availability-based tracking. This simplifies product management by focusing on whether sizes are available or out of stock, rather than tracking specific quantities.

## Changes Made

### 1. Database Schema
**File:** `app/lib/supabase/products-schema.sql`
- Changed `sizes` JSONB field from storing quantities to storing boolean availability
- Before: `{"S": 10, "M": 15, "L": 20}` (quantities)
- After: `{"S": true, "M": true, "L": false}` (availability)
- Default sizes: `{"S": true, "M": true, "L": true, "XL": true}`

### 2. Migration Script
**File:** `app/lib/supabase/products-availability-migration.sql`
Run this SQL script in your Supabase SQL editor to migrate existing data:
- Converts existing quantity values to boolean availability (qty > 0 = true, qty = 0 = false)
- Sets default sizes for products without sizes defined
- Updates in_stock status based on available sizes

### 3. TypeScript Interfaces
**Files:** 
- `app/lib/supabase/products.ts`
- `app/contexts/ProductContext.tsx`

Changed:
- `sizeQuantities?: Record<string, number>` → `sizeAvailability?: Record<string, boolean>`

### 4. Admin Panel Updates
**File:** `app/pilotage/products/page.tsx`

Changes:
- Replaced quantity input fields with availability toggle switches
- UI now shows "Disponible/Rupture" toggle for each size
- Product cards display available sizes count instead of total quantity (e.g., "3/4" means 3 out of 4 sizes available)
- Validation updated to require at least one size (no need for quantity > 0)

### 5. Customer-Facing Changes
**File:** `app/product/[id]/page.tsx`

- Only available sizes are displayed to customers
- Sizes marked as unavailable (rupture) are hidden from the size selection
- Product is considered "rupture" only when admin explicitly sets it

## How to Apply Migration

### Step 1: Update Database Schema
Run the migration script in Supabase:
```sql
-- Run the contents of app/lib/supabase/products-availability-migration.sql
```

### Step 2: Verify Migration
Check a few products in your database to ensure:
- `sizes` field now contains boolean values
- `in_stock` status is correctly calculated

### Step 3: Test Admin Panel
1. Login to admin panel (`/pilotage/products`)
2. Create a new product - verify size toggles work
3. Edit an existing product - verify availability toggles display correctly
4. Save changes and verify in database

### Step 4: Test Customer Experience
1. View product detail pages
2. Verify only available sizes are shown
3. Test adding to cart with different size combinations

## New Workflow

### For Admins:
1. **Adding a Product:**
   - Enter product details
   - Add sizes (S, M, L, XL, etc.)
   - All sizes are available by default
   - Toggle off any sizes that are out of stock

2. **Managing Stock:**
   - Edit product
   - Toggle size availability on/off as needed
   - No need to track quantities

3. **Product Goes Out of Stock:**
   - Edit product
   - Toggle specific sizes to "Rupture"
   - Product remains visible with available sizes only

### For Customers:
- Only see sizes that are currently available
- Can't select unavailable sizes
- Clear indication when entire product is out of stock

## Benefits

1. **Simpler Management:** No need to track specific quantities for each size
2. **Default Availability:** When registering a product, all sizes are assumed available
3. **Clearer UX:** Customers only see what they can actually order
4. **Flexible Control:** Admin can enable/disable specific sizes as needed
5. **No Quantity Sync Issues:** No risk of overselling due to quantity mismatches

## Rollback (if needed)

If you need to rollback to quantity-based system:
1. The old schema is commented in `products-schema.sql`
2. You'll need to manually convert boolean values back to quantities
3. Update TypeScript interfaces back to `sizeQuantities`
4. Revert the UI changes

## Support

If you encounter issues:
1. Check Supabase logs for database errors
2. Verify migration script ran successfully
3. Check browser console for frontend errors
4. Ensure all TypeScript types are updated consistently
