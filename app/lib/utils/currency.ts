/**
 * Format price to k format for front-end display
 * e.g., 18000 => "18k FCFA", 5500 => "5.5k FCFA", 500 => "500 FCFA"
 */
export function formatPrice(amount: number): string {
  if (amount >= 1000) {
    const thousands = amount / 1000;
    // Remove unnecessary decimals (e.g., 18.0k => 18k)
    const formatted = thousands % 1 === 0 ? thousands.toString() : thousands.toFixed(1);
    return `${formatted}k FCFA`;
  }
  return `${amount} FCFA`;
}

/**
 * Format price for admin/backend display (keep full numbers)
 * e.g., 18000 => "18,000 FCFA"
 */
export function formatPriceAdmin(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} FCFA`;
}
