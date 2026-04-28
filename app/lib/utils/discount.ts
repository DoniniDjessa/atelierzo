/**
 * Rule: If product price is 16,000 XOF and total quantity of such items in cart is 3 or more, 
 * price becomes 15,000 XOF
 */
export const BULK_THRESHOLD_PRICE = 16000;
export const BULK_DISCOUNT_PRICE = 15000;
export const BULK_MIN_QUANTITY = 3;

export function getEffectivePrice(originalPrice: number | string, totalQuantityAtThisPrice: number): number {
  const price = typeof originalPrice === 'string' ? parseFloat(originalPrice) : originalPrice;
  
  if (price === BULK_THRESHOLD_PRICE && totalQuantityAtThisPrice >= BULK_MIN_QUANTITY) {
    return BULK_DISCOUNT_PRICE;
  }
  return price;
}

/**
 * Helper to count how many items in the cart qualify for the bulk price
 */
export function countQualifyingItems(items: any[]): number {
  return items.reduce((count, item) => {
    const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
    if (price === BULK_THRESHOLD_PRICE) {
      return count + item.quantity;
    }
    return count;
  }, 0);
}
