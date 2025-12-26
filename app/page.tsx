'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import ProductCard from './components/ProductCard';
import CategoryCard from './components/CategoryCard';
import CategorySection from './components/CategorySection';
import Footer from './components/Footer';
import SatisfiedClientsCarousel from './components/SatisfiedClientsCarousel';
import FlashSaleSection from './components/FlashSaleSection';
import { useProducts } from './contexts/ProductContext';

export default function Home() {
  const router = useRouter();
  const { products } = useProducts();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Hero Section */}
      <section className="relative w-full h-[60vh] min-h-[500px] max-h-[700px] overflow-visible mb-16">
        {/* Background Image */}
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src="/bg.jpg"
            alt="Hero background"
            fill
            className="object-cover"
            priority
            unoptimized
          />
        </div>

        {/* Floating Info Card - Positioned to be half inside, half outside */}
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 z-20 w-full max-w-md px-4">
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-white/20">
            <div className="space-y-4">
              {/* Contact Information */}
              <div className="space-y-4">
                {/* Opening Hours */}
                <div className="flex items-center gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <span
                      className="text-sm font-semibold text-gray-800 dark:text-gray-200 block"
                      style={{ fontFamily: 'var(--font-ubuntu)' }}
                    >
                      Ouverture
                    </span>
                    <span
                      className="text-sm text-gray-600 dark:text-gray-400"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      09:00 AM - 06:00 PM
                    </span>
                  </div>
                </div>

                {/* Store Name */}
                <div>
                  <p
                    className="text-lg font-semibold text-gray-800 dark:text-gray-200"
                    style={{ fontFamily: 'var(--font-fira-sans)' }}
                  >
                    Atelier Zo, ici vous etes chez vous ❤️
                  </p>
                </div>

                {/* Phone */}
                <div className="flex items-center gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  <span
                    className="text-sm text-gray-600 dark:text-gray-400"
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    0707070707
                  </span>
                </div>

                {/* Email */}
                <div className="flex items-center gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <span
                    className="text-sm text-gray-600 dark:text-gray-400"
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    contact@contact@atelierzo.com
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Flash Sale Section */}
      <FlashSaleSection />

      {/* Products Grid Section */}
      <section className="py-12 px-3 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2
            className="text-3xl sm:text-4xl font-bold text-center mb-8 text-black dark:text-white px-2 sm:px-0"
            style={{ fontFamily: 'var(--font-ubuntu)' }}
          >
            Nos meilleurs produits
          </h2>

          {/* Products Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {products.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">Aucun produit disponible pour le moment</p>
              </div>
            )}
            {products.slice(0, 6).map((product) => (
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
              title="Tshirt Oversize Côte d'Ivoire Champions d'Afrique"
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
