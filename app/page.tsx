'use client';

import { useRouter } from 'next/navigation';
import Script from 'next/script';
import CategorySection from './components/CategorySection';
import Footer from './components/Footer';
import SatisfiedClientsCarousel from './components/SatisfiedClientsCarousel';
import FlashSaleSection from './components/FlashSaleSection';
import BestSellersSection from './components/BestSellersSection';
import CurrentOffersSection from './components/CurrentOffersSection';
import HeroCarousel from './components/HeroCarousel';
import { useProducts } from './contexts/ProductContext';
import { generateOrganizationJsonLd, generateWebsiteJsonLd } from './lib/utils/structured-data';

export default function Home() {
  const router = useRouter();
  const { products } = useProducts();

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

      {/* Best Sellers Section — driven by is_best_seller flag */}
      <BestSellersSection />

      {/* Current Offers Section — driven by is_current_offer flag */}
      <CurrentOffersSection />

      {/* Category Sections */}
      <section className="py-12 px-3 sm:px-6 lg:px-8 bg-gray-50 dark:bg-black">
        <div className="max-w-7xl mx-auto">
          {/* Bermuda Section */}
          {products.filter((p) => (p as any).category === 'bermuda').length > 0 && (
            <CategorySection
              title="T-SHIRTS OVERSIZES IMPRIMES"
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

          {/* Tshirt Oversize CIV Section */}
          {products.filter((p) => (p as any).category === 'tshirt-oversize-civ').length > 0 && (
            <CategorySection
              title="Tshirt Oversize CIV Champions"
              subtitle="Célébrez la victoire avec style"
              products={products
                .filter((p) => (p as any).category === 'tshirt-oversize-civ')
                .sort((a, b) => {
                  const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                  const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                  return aTime - bTime;
                })
                .slice(0, 12)
                .map((p) => ({
                  ...p,
                  isOutOfStock: !(p as any).inStock,
                }))}
              categoryPath="/products?category=tshirt-oversize-civ"
              onProductClick={(productId) => router.push(`/product/${productId}`)}
            />
          )}

          {/* Kids Section */}
          {products.filter((p) => p.isKidsProduct).length > 0 && (
            <CategorySection
              title="Enfants"
              subtitle="Découvrez nos collections pour les tout-petits"
              products={products
                .filter((p) => p.isKidsProduct)
                .slice(0, 4)
                .map((p) => ({
                  ...p,
                  isOutOfStock: !(p as any).inStock,
                }))}
              categoryPath="/products?category=kids"
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
