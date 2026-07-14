/**
 * Multi-buy promo pricing by unit price.
 * Products at 18.000 / 12.000 FCFA get pack rates instead of qty × unit price.
 */

export type PromoTier = { qty: number; price: number };

const PROMO_TIERS: Record<number, PromoTier[]> = {
  18000: [
    { qty: 1, price: 18000 },
    { qty: 2, price: 30000 },
    { qty: 4, price: 60000 },
  ],
  12000: [
    { qty: 1, price: 12000 },
    { qty: 2, price: 20000 },
    { qty: 3, price: 28000 },
  ],
};

export function hasPromoPricing(unitPrice: number): boolean {
  return Object.prototype.hasOwnProperty.call(PROMO_TIERS, unitPrice);
}

export function getPromoTiers(unitPrice: number): PromoTier[] | null {
  return PROMO_TIERS[unitPrice] ?? null;
}

/**
 * Best total for `quantity` pieces at `unitPrice`, using defined packs optimally.
 */
export function getPromoTotal(unitPrice: number, quantity: number): number {
  if (quantity <= 0) return 0;

  const tiers = PROMO_TIERS[unitPrice];
  if (!tiers) return unitPrice * quantity;

  const dp = new Array<number>(quantity + 1).fill(Number.POSITIVE_INFINITY);
  dp[0] = 0;

  for (let q = 1; q <= quantity; q++) {
    for (const tier of tiers) {
      if (tier.qty <= q && dp[q - tier.qty] < Number.POSITIVE_INFINITY) {
        dp[q] = Math.min(dp[q], dp[q - tier.qty] + tier.price);
      }
    }
    if (dp[q] === Number.POSITIVE_INFINITY) {
      dp[q] = unitPrice * q;
    }
  }

  return dp[quantity];
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
