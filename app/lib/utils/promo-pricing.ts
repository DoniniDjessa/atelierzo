/**
 * Multi-buy promo pricing by unit price (per price tier).
 * 2+ items at 18.000 (any products) → 15.000 / pc.
 * 2+ items at 12.000 (any products) → 10.000 / pc.
 * Mixing one 18k with one 12k does not unlock either promo.
 */

export type PromoTier = { qty: number; price: number };

/** Regular unit price → promo unit price (applies when that tier has qty >= 2). */
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
 * Promo unlocks when `unlockQuantity` (defaults to `quantity`) is >= 2
 * for that same unit price only.
 */
export function getPromoTotal(
  unitPrice: number,
  quantity: number,
  unlockQuantity?: number
): number {
  if (quantity <= 0) return 0;

  const promoUnit = PROMO_UNIT[unitPrice];
  const countForUnlock = unlockQuantity ?? quantity;
  if (!promoUnit || countForUnlock < 2) return unitPrice * quantity;

  return promoUnit * quantity;
}

export function getRegularTotal(unitPrice: number, quantity: number): number {
  return unitPrice * quantity;
}

export function getPromoSavings(
  unitPrice: number,
  quantity: number,
  unlockQuantity?: number
): number {
  if (!hasPromoPricing(unitPrice)) return 0;
  return Math.max(
    0,
    getRegularTotal(unitPrice, quantity) -
      getPromoTotal(unitPrice, quantity, unlockQuantity)
  );
}

/**
 * Split a promo total across cart lines of the same unit price (by quantity share).
 */
export function allocatePromoLineTotals(
  lines: Array<{ key: string; quantity: number }>,
  unitPrice: number,
  unlockQuantity?: number
): Record<string, number> {
  const totalQty = lines.reduce((sum, line) => sum + line.quantity, 0);
  const promoTotal = getPromoTotal(
    unitPrice,
    totalQty,
    unlockQuantity ?? totalQty
  );
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

/** Total quantity of cart items at a given unit price. */
export function getPriceTierQuantity(
  items: Array<{ price: number; quantity: number }>,
  unitPrice: number
): number {
  return items
    .filter((item) => item.price === unitPrice)
    .reduce((sum, item) => sum + item.quantity, 0);
}

export function cartItemKey(
  productId: string,
  size: string,
  color?: string
): string {
  return `${productId}__${size}__${color ?? ''}`;
}
