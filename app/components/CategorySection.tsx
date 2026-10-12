'use client';

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
  subtitle?: string;
  products: Product[];
  /** Total number of products in the category (the grid only shows a few) */
  totalCount: number;
  categoryPath: string;
  onProductClick?: (productId: string) => void;
}

export default function CategorySection({
  title,
  subtitle,
  products,
  totalCount,
  categoryPath,
  onProductClick,
}: CategorySectionProps) {
  return (
    <section className="mb-6 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/70 sm:mb-8 sm:p-6 lg:p-7">
      <SectionHeader
        title={title}
        subtitle={subtitle}
        count={totalCount}
        href={categoryPath}
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
        {products.map((product) => (
          <div key={product.id} className="min-w-0">
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
    </section>
  );
}
