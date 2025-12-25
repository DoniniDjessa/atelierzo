/**
 * Common fashion colors with their hex codes
 */
export interface ColorOption {
  name: string;
  hex: string;
  displayName: string; // French display name
}

export const FASHION_COLORS: ColorOption[] = [
  { name: 'noir', hex: '#000000', displayName: 'Noir' },
  { name: 'blanc', hex: '#FFFFFF', displayName: 'Blanc' },
  { name: 'gris', hex: '#808080', displayName: 'Gris' },
  { name: 'gris-fonce', hex: '#404040', displayName: 'Gris foncé' },
  { name: 'gris-clair', hex: '#C0C0C0', displayName: 'Gris clair' },
  { name: 'beige', hex: '#F5F5DC', displayName: 'Beige' },
  { name: 'kaki', hex: '#C3B091', displayName: 'Kaki' },
  { name: 'marine', hex: '#000080', displayName: 'Marine' },
  { name: 'bleu', hex: '#0000FF', displayName: 'Bleu' },
  { name: 'bleu-clair', hex: '#87CEEB', displayName: 'Bleu clair' },
  { name: 'rouge', hex: '#FF0000', displayName: 'Rouge' },
  { name: 'rouge-bordeaux', hex: '#800020', displayName: 'Rouge bordeaux' },
  { name: 'vert', hex: '#008000', displayName: 'Vert' },
  { name: 'vert-olive', hex: '#556B2F', displayName: 'Vert olive' },
  { name: 'vert-menthe', hex: '#98FB98', displayName: 'Vert menthe' },
  { name: 'jaune', hex: '#FFFF00', displayName: 'Jaune' },
  { name: 'orange', hex: '#FFA500', displayName: 'Orange' },
  { name: 'rose', hex: '#FFC0CB', displayName: 'Rose' },
  { name: 'violet', hex: '#800080', displayName: 'Violet' },
  { name: 'mauve', hex: '#E0B0FF', displayName: 'Mauve' },
  { name: 'turquoise', hex: '#40E0D0', displayName: 'Turquoise' },
  { name: 'corail', hex: '#FF7F50', displayName: 'Corail' },
  { name: 'ivoire', hex: '#FFFFF0', displayName: 'Ivoire' },
  { name: 'champagne', hex: '#F7E7CE', displayName: 'Champagne' },
  { name: 'sable', hex: '#F4A460', displayName: 'Sable' },
  { name: 'camel', hex: '#C19A6B', displayName: 'Camel' },
  { name: 'caramel', hex: '#AF6E4D', displayName: 'Caramel' },
  { name: 'taupe', hex: '#8B7355', displayName: 'Taupe' },
  { name: 'vin', hex: '#722F37', displayName: 'Vin' },
];

/**
 * Get color hex code by name
 */
export function getColorHex(colorName: string): string | null {
  const color = FASHION_COLORS.find((c) => c.name === colorName || c.displayName.toLowerCase() === colorName.toLowerCase());
  return color?.hex || null;
}

/**
 * Get color name by hex code
 */
export function getColorName(hexCode: string): string | null {
  const color = FASHION_COLORS.find((c) => c.hex.toLowerCase() === hexCode.toLowerCase());
  return color?.displayName || null;
}

