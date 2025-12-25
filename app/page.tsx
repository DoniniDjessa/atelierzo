'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import ProductCard from './components/ProductCard';
import CategoryCard from './components/CategoryCard';
import CategorySection from './components/CategorySection';
import Footer from './components/Footer';
import SatisfiedClientsCarousel from './components/SatisfiedClientsCarousel';
import { useProducts } from './contexts/ProductContext';

// Keep for backwards compatibility - will be replaced by ProductContext
const sampleProducts = [
  {
    id: '1',
    title: 'Ensemble Premium',
    description: 'Chemise élégante assortie avec bermuda moderne',
    price: 45000,
    oldPrice: 55000,
    imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=300&h=400&fit=crop',
    sizes: ['S', 'M', 'L', 'XL'],
  },
  {
    id: '2',
    title: 'Collection Été',
    description: 'Style décontracté pour vos journées ensoleillées',
    price: 35000,
    oldPrice: 42000,
    imageUrl: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=300&h=400&fit=crop',
    sizes: ['M', 'L', 'XL'],
  },
  {
    id: '3',
    title: 'Ensemble Classique',
    description: 'Élégance intemporelle pour toutes occasions',
    price: 48000,
    oldPrice: 60000,
    imageUrl: 'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=300&h=400&fit=crop',
    sizes: ['S', 'M', 'L'],
  },
  {
    id: '4',
    title: 'Style Moderne',
    description: 'Design contemporain avec coupe ajustée',
    price: 40000,
    oldPrice: 50000,
    imageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=300&h=400&fit=crop',
    sizes: ['S', 'M', 'L', 'XL'],
  },
  {
    id: '5',
    title: 'Collection Premium',
    description: 'Qualité supérieure et confort optimal',
    price: 55000,
    oldPrice: 65000,
    imageUrl: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=300&h=400&fit=crop',
    sizes: ['M', 'L', 'XL'],
  },
  {
    id: '6',
    title: 'Ensemble Sport',
    description: 'Confort et style pour vos activités',
    price: 32000,
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=400&fit=crop',
    sizes: ['S', 'M', 'L'],
  },
];

export default function Home() {
  const router = useRouter();
  const { products } = useProducts();

  // Use products from context, fallback to sampleProducts for backwards compatibility
  const displayProducts = products.length > 0 ? products : sampleProducts;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Hero Section */}
      <section className="relative w-full h-[60vh] min-h-[500px] max-h-[700px] overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="https://i.pinimg.com/564x/a8/67/89/a86789e8c5d0c2a6f3e8d7b5c9a3e4f5.jpg"
            alt="Hero background"
            fill
            className="object-cover"
            priority
            unoptimized
          />
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/50"></div>
        </div>

        {/* Floating Info Card */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 w-full max-w-md px-4">
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
                    Akwaba Chez ASMEN Abidjan ❤️
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

        {/* Decorative gradient at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-50 dark:from-black to-transparent"></div>
      </section>

      {/* Products Grid Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2
            className="text-3xl sm:text-4xl font-bold text-center mb-8 text-black dark:text-white"
            style={{ fontFamily: 'var(--font-fira-sans)' }}
          >
            Nos meilleurs produits
          </h2>

          {/* Products Grid with horizontal scroll */}
          {/* Mobile: 2.5 items visible (40% width each) */}
          {/* Tablet: 3.5 items visible (28.571% width each) */}
          {/* Desktop: 4.2 items visible (23.81% width each) */}
          <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
            <div className="flex gap-6 w-max">
              {displayProducts.slice(0, 6).map((product) => (
                <div
                  key={product.id}
                  className="flex-shrink-0 w-[calc(100vw/2.5-2rem)] sm:w-[calc(100vw/3.5-2rem)] lg:w-[calc(100vw/4.2-2rem)]"
                >
                  <ProductCard
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
                </div>
              ))}
            </div>
          </div>

          {/* Custom scrollbar styles for webkit browsers */}
          <style jsx>{`
            .scrollbar-thin::-webkit-scrollbar {
              height: 8px;
            }
            .scrollbar-thin::-webkit-scrollbar-track {
              background: transparent;
            }
            .scrollbar-thin::-webkit-scrollbar-thumb {
              background-color: rgba(156, 163, 175, 0.5);
              border-radius: 4px;
            }
            .scrollbar-thin::-webkit-scrollbar-thumb:hover {
              background-color: rgba(156, 163, 175, 0.7);
            }
          `}</style>
        </div>
      </section>

      {/* Category Sections */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-black">
        <div className="max-w-7xl mx-auto">
          {/* Chemise Bermuda Section */}
          <CategorySection
            title="Chemise Bermuda"
            subtitle="Découvrez nos ensembles élégants pour un style décontracté et moderne"
            products={displayProducts
              .filter((p) => p.category === 'bermuda')
              .slice(0, 4)
              .map((p) => ({
                ...p,
                isOutOfStock: !p.inStock,
              }))}
            categoryPath="/categories/chemise-bermuda"
            onProductClick={(productId) => router.push(`/product/${productId}`)}
          />

          {/* Chemise Pantalon Section */}
          <CategorySection
            title="Chemise Pantalon"
            subtitle="Sélection d'ensembles professionnels et élégants pour toutes occasions"
            products={displayProducts
              .filter((p) => p.category === 'pantalon')
              .slice(0, 4)
              .map((p) => ({
                ...p,
                isOutOfStock: !p.inStock,
              }))}
            categoryPath="/categories/chemise-pantalon"
            onProductClick={(productId) => router.push(`/product/${productId}`)}
          />
        </div>
      </section>

      {/* Satisfied Clients Carousel */}
      <SatisfiedClientsCarousel />

      <Footer />
    </div>
  );
}
