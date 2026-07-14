/**
 * Multi-buy promo pricing by unit price.
 * From 2+ items: 18.000 → 15.000 / pc, 12.000 → 10.000 / pc.
 */

export type PromoTier = { qty: number; price: number };

/** Regular unit price → promo unit price (applies when qty >= 2). */
const PROMO_UNIT: Record<number, number> = {
  18000: 15000,
  12000: 10000,
};

export function hasPromoPricing(unitPrice: number): boolean {
  return Object.prototype.hasOwnProperty.call(PROMO_UNIT, unitPrice);
}

export function getPromoUnit(unitPrice: number): number | null {
  return PROMO_UNIT[unitPrice] ?? null;
}

/** Sample totals shown on the product page (1 / 2 / 3 articles). */
export function getPromoTiers(unitPrice: number): PromoTier[] | null {
  const promoUnit = PROMO_UNIT[unitPrice];
  if (!promoUnit) return null;
  return [
    { qty: 1, price: unitPrice },
    { qty: 2, price: promoUnit * 2 },
    { qty: 3, price: promoUnit * 3 },
  ];
}

/**
 * Total for `quantity` pieces at `unitPrice`.
 * 1 item = regular price; 2+ = promo unit × quantity.
 */
export function getPromoTotal(unitPrice: number, quantity: number): number {
  if (quantity <= 0) return 0;

  const promoUnit = PROMO_UNIT[unitPrice];
  if (!promoUnit || quantity < 2) return unitPrice * quantity;

  return promoUnit * quantity;
}

export function getRegularTotal(unitPrice: number, quantity: number): number {
  return unitPrice * quantity;
}

export function getPromoSavings(unitPrice: number, quantity: number): number {
  if (!hasPromoPricing(unitPrice)) return 0;
  return Math.max(0, getRegularTotal(unitPrice, quantity) - getPromoTotal(unitPrice, quantity));
}

/**
 * Split a product-level promo total across cart lines of that product (by quantity share).
 */
export function allocatePromoLineTotals(
  lines: Array<{ key: string; quantity: number }>,
  unitPrice: number
): Record<string, number> {
  const totalQty = lines.reduce((sum, line) => sum + line.quantity, 0);
  const promoTotal = getPromoTotal(unitPrice, totalQty);
  const result: Record<string, number> = {};

  if (totalQty === 0 || lines.length === 0) return result;

  let allocated = 0;
  lines.forEach((line, index) => {
    if (index === lines.length - 1) {
      result[line.key] = promoTotal - allocated;
    } else {
      const share = Math.round((line.quantity / totalQty) * promoTotal);
      result[line.key] = share;
      allocated += share;
    }
  });

  return result;
}

export function cartItemKey(
  productId: string,
  size: string,
  color?: string
): string {
  return `${productId}__${size}__${color ?? ''}`;
}
