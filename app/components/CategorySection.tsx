'use client';

import { useRouter } from 'next/navigation';
import ProductCard from './ProductCard';
import SectionHeader from './SectionHeader';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  oldPrice?: number;
  imageUrl: string;
  colors?: string[];
  sizes?: string[];
  isOutOfStock?: boolean;
}

interface CategorySectionProps {
  title: string;
  subtitle: string;
  products: Product[];
  categoryPath?: string;
  onProductClick?: (productId: string) => void;
}

export default function CategorySection({
  title,
  subtitle,
  products,
  categoryPath,
  onProductClick,
}: CategorySectionProps) {
  const router = useRouter();

  const handleViewAll = () => {
    // Map category titles to category values
    const categoryMap: Record<string, string> = {
      'Chemise Bermuda': 'bermuda',
      'Chemise Pantalon': 'pantalon',
      'Tshirt Oversize CIV Champions d\'Afrique': 'tshirt-oversize-civ',
    };
    
    const categoryValue = categoryMap[title];
    if (categoryValue) {
      router.push(`/products?category=${categoryValue}`);
    } else {
      router.push('/products');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 sm:p-6 mb-8">
      {/* Section Header with Category Pills */}
      <div className="px-1 sm:px-0">
        <SectionHeader activeCategoryName={title} />
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6">
        {products.map((product) => (
          <div key={product.id} className="relative">
            <ProductCard
              productId={product.id}
              title={product.title}
              description={product.description}
              price={product.price}
              oldPrice={product.oldPrice}
              imageUrl={product.imageUrl}
              colors={product.colors}
              sizes={product.sizes}
              hideAddToCart={true}
              isOutOfStock={product.isOutOfStock}
              onClick={() => onProductClick?.(product.id)}
            />
          </div>
        ))}
      </div>

      {/* View All Button */}
      <div className="flex justify-center px-2 sm:px-0">
        <button
          onClick={handleViewAll}
          className="w-full max-w-xs flex items-center justify-center gap-2 py-2 sm:py-3 px-4 sm:px-6 bg-gradient-to-r from-cyan-400 to-cyan-700 hover:from-cyan-500 hover:to-cyan-800 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-105 active:scale-95 text-sm"
          style={{ fontFamily: 'var(--font-poppins)' }}
        >
          <span className="text-sm">Afficher tout</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

