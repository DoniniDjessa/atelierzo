'use client';

import { useProducts } from '@/app/contexts/ProductContext';

interface SectionHeaderProps {
  activeCategoryName: string;
}

const categoryMap: Record<string, string> = {
  'Home': 'all',
  'Chemise Bermuda': 'bermuda',
  'Chemise Pantalon': 'pantalon',
  'Tshirt Oversize Côte d\'Ivoire Champions d\'Afrique': 'tshirt-oversize-civ',
};

export default function SectionHeader({ activeCategoryName }: SectionHeaderProps) {
  const { products } = useProducts();

  const getProductCount = (categoryKey: string) => {
    if (categoryKey === 'all') {
      return products.length;
    }
    return products.filter((p) => p.category === categoryKey).length;
  };

  const categoryKey = categoryMap[activeCategoryName] || 'all';
  const productCount = getProductCount(categoryKey);

  return (
    <div className="mb-6 inline-flex">
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#B9F19D] font-bold">
        <span className="text-black whitespace-nowrap" style={{ fontFamily: 'var(--font-poppins)' }}>
          {activeCategoryName}
        </span>
        <span className="bg-black text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {productCount}
        </span>
      </div>
    </div>
  );
}

