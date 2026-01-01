# Quantity-Based Inventory System - Migration Guide

## Overview
This system has been reverted back to a **quantity-based inventory** instead of availability-based toggles. Products now track actual quantities per size, with automatic stock deduction on orders.

## Key Features

### 1. **Quantity Tracking**
- Each size has a specific quantity (e.g., `{"M": 10, "L": 5, "XL": 0}`)
- Default quantities: M=10, L=10, XL=10, 2XL=10, 3XL=10, 4XL=10, 5XL=10

### 2. **Automatic Stock Decrease**
- When an order is placed, quantities automatically decrease
- Example: Order 2 units of size M → M quantity goes from 10 to 8
- Located in: `app/lib/supabase/orders.ts` (lines 93-128)

### 3. **Stock Status Logic**
- **In Stock**: At least one size has quantity > 0
- **Rupture (Out of Stock)**: ALL sizes have quantity = 0
- Auto-calculated when products are saved

### 4. **Frontend Filtering**
- Sizes with 0 quantity are hidden from customers
- Only available sizes (qty > 0) are shown
- Product marked as "rupture" only when all sizes are sold out

## Database Schema

### Table: `zo-products`
```sql
sizes JSONB NOT NULL DEFAULT '{"M": 10, "L": 10, "XL": 10, "2XL": 10, "3XL": 10, "4XL": 10, "5XL": 10}'::jsonb
```

### Migration SQL
Run this to convert existing data:
```sql
-- File: app/lib/supabase/products-quantity-migration.sql
UPDATE "zo-products"
SET sizes = (
  SELECT jsonb_object_agg(
    key,
    CASE 
      WHEN value::text = 'true' THEN '10'::jsonb
      ELSE '0'::jsonb
    END
  )
  FROM jsonb_each(sizes)
)
WHERE sizes IS NOT NULL;
```

## Code Changes

### 1. Product Interface
**File**: `app/contexts/ProductContext.tsx` & `app/lib/supabase/products.ts`

```typescript
export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  // ... other fields
  sizeQuantities?: Record<string, number>; // Changed from sizeAvailability
  inStock?: boolean;
}
```

### 2. Admin Panel
**File**: `app/pilotage/products/page.tsx`

- Number inputs instead of toggle switches
- Shows current quantity for each size
- Debounced input (3 seconds) for smooth editing
- Auto-saves when you stop typing

```tsx
// State variable
const [sizeQuantities, setSizeQuantities] = useState<Record<string, number>>({
  M: 10, L: 10, XL: 10, '2XL': 10, '3XL': 10, '4XL': 10, '5XL': 10
});

// UI Component
<input
  type="number"
  min="0"
  value={editingSizeValues[size] ?? quantity}
  onChange={(e) => handleSizeEdit(size, e.target.value)}
  onBlur={() => handleSizeBlur(size)}
/>
```

### 3. Product Display
**File**: `app/product/[id]/page.tsx`

```typescript
// Filter out sizes with 0 quantity
product.sizes
  .filter(size => !product.sizeQuantities || product.sizeQuantities[size] > 0)
  .map((size) => {
    // Display size button
  })
```

### 4. Automatic Stock Decrease
**File**: `app/lib/supabase/orders.ts`

```typescript
// When order is created (lines 93-128)
for (const item of input.items) {
  const sizes = product.sizes as Record<string, number>;
  const currentQty = sizes[item.size] || 0;
  const newQty = Math.max(0, currentQty - item.quantity);
  
  const updatedSizes = {
    ...sizes,
    [item.size]: newQty,
  };
  
  const totalQuantity = Object.values(updatedSizes).reduce((sum, qty) => sum + qty, 0);
  
  await supabase
    .from('zo-products')
    .update({
      sizes: updatedSizes,
      in_stock: totalQuantity > 0,
    })
    .eq('id', item.product_id);
}
```

## Admin Panel Usage

### Adding/Editing Products

1. **Add a New Product**:
   - Fill in title, description, price
   - Upload image
   - Select colors (optional)
   - **Sizes**: Default sizes (M-5XL) are pre-loaded with qty=10
   - Add custom sizes if needed
   - Enter quantity for each size

2. **Edit Quantities**:
   - Click "Modifier" on any product
   - Edit quantity in number input
   - System auto-saves 3 seconds after you stop typing
   - Or click elsewhere to save immediately

3. **Stock Status**:
   - Automatically calculated
   - Green badge = In Stock (at least one size has qty > 0)
   - Red badge = Rupture (all sizes have qty = 0)

### Example Workflow

```
1. Create product "Chemise Bermuda Blue"
   - M: 10, L: 10, XL: 10, 2XL: 10

2. Customer orders 2 units of size M
   → Automatic decrease: M: 10 → 8

3. Another customer orders 8 units of size M
   → Automatic decrease: M: 8 → 0
   → Size M now hidden from frontend

4. More orders for other sizes...
   → When ALL sizes reach 0, product shows "Rupture de stock"
```

## Testing Checklist

- [ ] Products display default sizes (M-5XL) with qty=10
- [ ] Number inputs accept values ≥ 0
- [ ] Sizes with qty=0 hidden on product pages
- [ ] Product marked "rupture" only when all sizes = 0
- [ ] Orders automatically decrease quantities
- [ ] Quantities can't go below 0
- [ ] Admin panel shows correct quantities
- [ ] Stock status badge updates correctly

## Files Modified

1. ✅ `app/contexts/ProductContext.tsx` - Product interface
2. ✅ `app/lib/supabase/products.ts` - All CRUD operations
3. ✅ `app/lib/supabase/products-schema.sql` - Database schema
4. ✅ `app/lib/supabase/products-quantity-migration.sql` - Migration script
5. ✅ `app/pilotage/products/page.tsx` - Admin panel UI
6. ✅ `app/product/[id]/page.tsx` - Frontend filtering
7. ✅ `app/lib/supabase/orders.ts` - Auto stock decrease (already implemented)

## Rollback (If Needed)

To revert to availability-based system:
1. Change `sizeQuantities` back to `sizeAvailability`
2. Update interfaces to `Record<string, boolean>`
3. Replace number inputs with toggle switches
4. Remove auto-decrease logic from orders

## Support

For issues or questions:
- Check console for error messages
- Verify database migration ran successfully
- Ensure all Product interfaces are updated
- Test with a sample product first
