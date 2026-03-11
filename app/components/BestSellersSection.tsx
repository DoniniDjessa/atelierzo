'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import ProductCard from './ProductCard';
import { getBestSellers } from '@/app/lib/supabase/products';

export default function BestSellersSection() {
  const router = useRouter();
  const [bestSellers, setBestSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBestSellers().then(({ data }) => {
      setBestSellers(data || []);
      setLoading(false);
    });
  }, []);

  // Hide section entirely while loading or when there are no best sellers
  if (loading || bestSellers.length === 0) return null;

  return (
    <section className="py-12 px-3 sm:px-6 lg:px-8 bg-gray-50 dark:bg-black">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Image
            src="/logo.png"
            alt="Les Ateliers Zo"
            width={60}
            height={20}
            className="h-8 w-auto object-contain"
            priority
            unoptimized
          />
          <h2
            className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent px-2 sm:px-0"
            style={{ fontFamily: 'var(--font-ubuntu)' }}
          >
            Nos Meilleurs Produits
          </h2>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {bestSellers.map((product) => (
            <ProductCard
              key={product.id}
              productId={product.id}
              title={product.title}
              description={product.description}
              price={product.price}
              oldPrice={product.oldPrice}
              imageUrl={product.imageUrl}
              sizes={product.sizes}
              hideAddToCart={true}
              isOutOfStock={!product.inStock}
              onClick={() => router.push(`/product/${product.id}`)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
