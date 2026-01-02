'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import Footer from '@/app/components/Footer';
import ProductCard from '@/app/components/ProductCard';
import { getActiveVenteFlash, calculateFlashSalePrice } from '@/app/lib/supabase/vente-flash';
import { useProducts } from '@/app/contexts/ProductContext';

export default function VenteFlashPage() {
  const router = useRouter();
  const { products, getProductById } = useProducts();
  const [loading, setLoading] = useState(true);
  const [venteFlash, setVenteFlash] = useState<any[]>([]);
  const [flashSaleProducts, setFlashSaleProducts] = useState<any[]>([]);

  useEffect(() => {
    loadVenteFlash();
  }, [products]);

  const loadVenteFlash = async () => {
    setLoading(true);
    try {
      const { data, error } = await getActiveVenteFlash();
      if (error) {
        console.error('Error loading flash sales:', error);
      } else {
        setVenteFlash(data || []);
        // Get all products from active flash sales
        const allProducts: any[] = [];
        (data || []).forEach((vf) => {
          if (vf.products) {
            vf.products.forEach((vfProduct: any) => {
              const product = getProductById(vfProduct.product_id);
              if (product) {
                const discount = vfProduct.discount_percentage || vf.global_discount_percentage || 0;
                const discountedPrice = calculateFlashSalePrice(product.price, discount);
                allProducts.push({
                  ...product,
                  discountPercentage: discount,
                  flashSalePrice: discountedPrice,
                  oldPrice: product.price,
                });
              }
            });
          }
        });
        setFlashSaleProducts(allProducts);
      }
    } catch (error: any) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <div className="flex items-center justify-center py-32">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (flashSaleProducts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 mb-8 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            <ArrowLeft className="h-5 w-5" />
            Retour à l'accueil
          </button>
          
          <div className="text-center py-32">
            <div className="mb-6">
              <span className="text-6xl">⚡</span>
            </div>
            <h1
              className="text-3xl font-bold text-black dark:text-white mb-4"
              style={{ fontFamily: 'var(--font-ubuntu)' }}
            >
              Aucune vente flash pour le moment
            </h1>
            <p
              className="text-gray-600 dark:text-gray-400 mb-8"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              Revenez plus tard pour découvrir nos offres spéciales !
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors font-semibold"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              Découvrir nos produits
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-12">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 mb-8 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors px-2 sm:px-0"
          style={{ fontFamily: 'var(--font-poppins)' }}
        >
          <ArrowLeft className="h-5 w-5" />
          Retour à l'accueil
        </button>

        {/* Header */}
        <div className="mb-12 text-center px-2 sm:px-0">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 mb-6 shadow-lg">
            <span className="text-4xl">⚡</span>
          </div>
          <h1
            className="text-4xl sm:text-5xl font-bold text-black dark:text-white mb-4"
            style={{ fontFamily: 'var(--font-ubuntu)' }}
          >
            Vente Flash
          </h1>
          {venteFlash.length > 0 && venteFlash[0] && (
            <p
              className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              {venteFlash[0].description || 'Profitez de nos offres spéciales limitées dans le temps !'}
            </p>
          )}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {flashSaleProducts.map((product) => (
            <div key={product.id} className="relative">
              <div className="absolute -top-2 -right-2 z-10 bg-gradient-to-br from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                -{product.discountPercentage}%
              </div>
              <ProductCard
                key={product.id}
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
      </div>
      <Footer />
    </div>
  );
}

