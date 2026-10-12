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
import { useCategories } from './lib/hooks/useCategories';
import { generateOrganizationJsonLd, generateWebsiteJsonLd } from './lib/utils/structured-data';

export default function Home() {
  const router = useRouter();
  const { products } = useProducts();
  const { roots } = useCategories();

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
          {/* One section per category (managed in /pilotage/categories) */}
          {roots
            .filter((category) => category.show_on_home)
            .map((category) => {
              const categoryProducts = products.filter((p) => p.category === category.slug);
              if (categoryProducts.length === 0) return null;
              return (
                <CategorySection
                  key={category.id}
                  title={category.name}
                  subtitle={category.description ?? undefined}
                  totalCount={categoryProducts.length}
                  products={categoryProducts.slice(0, category.home_limit).map((p) => ({
                    ...p,
                    isOutOfStock: !(p as any).inStock,
                  }))}
                  categoryPath={`/products?category=${encodeURIComponent(category.slug)}`}
                  onProductClick={(productId) => router.push(`/product/${productId}`)}
                />
              );
            })}

          {/* Kids Section */}
          {products.filter((p) => p.isKidsProduct).length > 0 && (
            <CategorySection
              title="Enfants"
              subtitle="Découvrez nos collections pour les tout-petits"
              totalCount={products.filter((p) => p.isKidsProduct).length}
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
