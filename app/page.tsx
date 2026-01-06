'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import ProductCard from './components/ProductCard';
import CategoryCard from './components/CategoryCard';
import CategorySection from './components/CategorySection';
import Footer from './components/Footer';
import SatisfiedClientsCarousel from './components/SatisfiedClientsCarousel';
import FlashSaleSection from './components/FlashSaleSection';
import HeroCarousel from './components/HeroCarousel';
import { useProducts } from './contexts/ProductContext';
import { getMostSoldProducts } from './lib/utils/product-stats';
import { generateOrganizationJsonLd, generateWebsiteJsonLd } from './lib/utils/structured-data';

export default function Home() {
  const router = useRouter();
  const { products } = useProducts();
  const [bestProducts, setBestProducts] = useState<any[]>([]);

  useEffect(() => {
    const loadBestProducts = async () => {
      try {
        // Get 5 most sold products
        const mostSold = await getMostSoldProducts(5);
        
        if (mostSold.length > 0) {
          // Create a map of products by ID for quick lookup
          const productsMap = new Map(products.map(p => [p.id, p]));
          
          // Map product IDs to actual product objects
          const productsList = mostSold
            .map((item) => productsMap.get(item.productId))
            .filter((p) => p !== undefined) as any[];
          
          // If we have products from orders, use them; ensure minimum 5 if possible
          if (productsList.length >= 5) {
            setBestProducts(productsList);
          } else if (products.length >= 5) {
            // Fill up to 5 with other products if available
            const usedIds = new Set(productsList.map(p => p.id));
            const additionalProducts = products.filter(p => !usedIds.has(p.id));
            setBestProducts([...productsList, ...additionalProducts].slice(0, 5));
          } else {
            // Show all available products if less than 5
            setBestProducts(productsList.length > 0 ? productsList : products);
          }
        } else {
          // If no products with orders, show minimum 5 products if available
          setBestProducts(products.slice(0, Math.max(5, products.length)));
        }
      } catch (error) {
        console.error('Error loading best products:', error);
        // Fallback to minimum 5 products on error
        setBestProducts(products.slice(0, Math.max(5, products.length)));
      }
    };

    if (products.length > 0) {
      loadBestProducts();
    } else {
      // If no products available, clear bestProducts
      setBestProducts([]);
    }
  }, [products]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Structured Data for SEO */}
      <Script
        id="organization-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateOrganizationJsonLd()),
        }}
      />
      <Script
        id="website-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateWebsiteJsonLd()),
        }}
      />

      {/* Hero Section */}
      <HeroCarousel />

      {/* Flash Sale Section */}
      <FlashSaleSection />

      {/* Products Grid Section */}
      <section className="py-12 px-3 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
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
              className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-cyan-700 bg-clip-text text-transparent px-2 sm:px-0"
              style={{ fontFamily: 'var(--font-ubuntu)' }}
            >
              Nos Offres Zo du moment
            </h2>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {bestProducts.length === 0 && products.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">Aucun produit disponible pour le moment</p>
              </div>
            )}
            {bestProducts.map((product) => (
              <ProductCard
                key={product.id}
                productId={product.id}
                title={product.title}
                description={product.description}
                price={product.price}
                oldPrice={(product as any).oldPrice}
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

      {/* Category Sections */}
      <section className="py-12 px-3 sm:px-6 lg:px-8 bg-gray-50 dark:bg-black">
        <div className="max-w-7xl mx-auto">
          {/* Chemise Bermuda Section */}
          {products.filter((p) => (p as any).category === 'bermuda').length > 0 && (
            <CategorySection
              title="Chemise Bermuda"
              subtitle="Découvrez nos ensembles élégants pour un style décontracté et moderne"
              products={products
                .filter((p) => (p as any).category === 'bermuda')
                .slice(0, 4)
                .map((p) => ({
                  ...p,
                  isOutOfStock: !(p as any).inStock,
                }))}
              categoryPath="/products?category=bermuda"
              onProductClick={(productId) => router.push(`/product/${productId}`)}
            />
          )}

          {/* Chemise Pantalon Section */}
          {products.filter((p) => (p as any).category === 'pantalon').length > 0 && (
            <CategorySection
              title="Chemise Pantalon"
              subtitle="Sélection d'ensembles professionnels et élégants pour toutes occasions"
              products={products
                .filter((p) => (p as any).category === 'pantalon')
                .slice(0, 4)
                .map((p) => ({
                  ...p,
                  isOutOfStock: !(p as any).inStock,
                }))}
              categoryPath="/products?category=pantalon"
              onProductClick={(productId) => router.push(`/product/${productId}`)}
            />
          )}

          {/* Tshirt Oversize CIV Section */}
          {products.filter((p) => (p as any).category === 'tshirt-oversize-civ').length > 0 && (
            <CategorySection
              title="Tshirt Oversize CIV Champions"
              subtitle="Célébrez la victoire avec style"
              products={products
                .filter((p) => (p as any).category === 'tshirt-oversize-civ')
                .slice(0, 4)
                .map((p) => ({
                  ...p,
                  isOutOfStock: !(p as any).inStock,
                }))}
              categoryPath="/products?category=tshirt-oversize-civ"
              onProductClick={(productId) => router.push(`/product/${productId}`)}
            />
          )}
        </div>
      </section>

      {/* Satisfied Clients Carousel */}
      <SatisfiedClientsCarousel />

      <Footer />
    </div>
  );
}
