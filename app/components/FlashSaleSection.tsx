'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProductCard from './ProductCard';
import { getActiveVenteFlash, calculateFlashSalePrice } from '@/app/lib/supabase/vente-flash';
import { useProducts } from '@/app/contexts/ProductContext';

export default function FlashSaleSection() {
  const router = useRouter();
  const { products, getProductById } = useProducts();
  const [flashSaleProducts, setFlashSaleProducts] = useState<any[]>([]);
  const [venteFlash, setVenteFlash] = useState<any | null>(null);

  useEffect(() => {
    loadFlashSale();
  }, [products]);

  const loadFlashSale = async () => {
    try {
      const { data, error } = await getActiveVenteFlash();
      if (error || !data || data.length === 0) {
        setFlashSaleProducts([]);
        setVenteFlash(null);
        return;
      }

      const activeFlashSale = data[0]; // Take the first active flash sale
      setVenteFlash(activeFlashSale);

      if (activeFlashSale.products && activeFlashSale.products.length > 3) {
        // Get products (max 5)
        const productsToShow = activeFlashSale.products.slice(0, 5).map((vfProduct: any) => {
          const product = getProductById(vfProduct.product_id);
          if (product) {
            const discount = vfProduct.discount_percentage || activeFlashSale.global_discount_percentage || 0;
            const discountedPrice = calculateFlashSalePrice(product.price, discount);
            return {
              ...product,
              discountPercentage: discount,
              flashSalePrice: discountedPrice,
              oldPrice: product.price,
            };
          }
          return null;
        }).filter(Boolean);

        setFlashSaleProducts(productsToShow);
      } else {
        setFlashSaleProducts([]);
      }
    } catch (error) {
      console.error('Error loading flash sale:', error);
      setFlashSaleProducts([]);
      setVenteFlash(null);
    }
  };

  // Only display if we have more than 3 products
  if (flashSaleProducts.length <= 3) {
    return null;
  }

  return (
    <section className="py-12 sm:py-16 bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 dark:from-yellow-900/10 dark:via-amber-900/10 dark:to-orange-900/10">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center px-2 sm:px-0">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
              <span className="text-2xl">⚡</span>
            </div>
            <h2
              className="text-3xl sm:text-4xl font-bold text-black dark:text-white"
              style={{ fontFamily: 'var(--font-ubuntu)' }}
            >
              Vente Flash
            </h2>
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
              <span className="text-2xl">⚡</span>
            </div>
          </div>
          {venteFlash?.description && (
            <p
              className="text-gray-700 dark:text-gray-300 max-w-2xl mx-auto"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              {venteFlash.description}
            </p>
          )}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
          {flashSaleProducts.map((product) => (
            <div key={product.id} className="relative">
              {/* Discount Badge */}
              <div className="absolute top-3 left-3 z-10 bg-gradient-to-br from-yellow-400 to-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
                -{product.discountPercentage}%
              </div>
              <ProductCard
                productId={product.id}
                title={product.title}
                description={product.description}
                price={product.flashSalePrice}
                oldPrice={product.oldPrice}
                imageUrl={product.imageUrl}
                colors={product.colors}
                sizes={product.sizes}
                inStock={product.inStock}
                category={product.category}
                hideAddToCart={false}
                onClick={() => router.push(`/product/${product.id}`)}
              />
            </div>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-8">
          <button
            onClick={() => router.push('/vente-flash')}
            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 text-white rounded-lg hover:from-yellow-500 hover:via-amber-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl font-semibold"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            Voir tout
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}

