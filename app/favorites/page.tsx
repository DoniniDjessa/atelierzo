'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useFavorites } from '@/app/contexts/FavoritesContext';
import { useProducts } from '@/app/contexts/ProductContext';
import ProductCard from '@/app/components/ProductCard';
import { useUser } from '@/app/contexts/UserContext';

export default function FavoritesPage() {
  const router = useRouter();
  const { user } = useUser();
  const { favorites } = useFavorites();
  const { products } = useProducts();

  // Get favorite products
  const favoriteProducts = products.filter((product) => favorites.includes(product.id));

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center px-4">
        <div className="text-center">
          <h1
            className="text-2xl font-bold text-black dark:text-white mb-4"
            style={{ fontFamily: 'var(--font-fira-sans)' }}
          >
            Connexion requise
          </h1>
          <p
            className="text-gray-600 dark:text-gray-400 mb-6"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            Veuillez vous connecter pour voir vos favoris
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors font-semibold"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-3xl sm:text-4xl font-bold text-black dark:text-white mb-2"
            style={{ fontFamily: 'var(--font-fira-sans)' }}
          >
            Mes favoris
          </h1>
          <p
            className="text-sm text-gray-600 dark:text-gray-400"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            {favoriteProducts.length} produit(s) dans vos favoris
          </p>
        </div>

        {/* Products Grid */}
        {favoriteProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            {favoriteProducts.map((product) => (
              <ProductCard
                key={product.id}
                productId={product.id}
                title={product.title}
                description={product.description}
                price={product.price}
                oldPrice={product.oldPrice}
                imageUrl={product.imageUrl}
                colors={product.colors}
                sizes={product.sizes}
                isFavorite={true}
                hideAddToCart={true}
                onClick={() => router.push(`/product/${product.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
              />
            </svg>
            <h2
              className="text-xl font-bold text-black dark:text-white mb-2"
              style={{ fontFamily: 'var(--font-fira-sans)' }}
            >
              Aucun favori
            </h2>
            <p
              className="text-sm text-gray-600 dark:text-gray-400 mb-6"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              Commencez à ajouter des produits à vos favoris pour les retrouver facilement
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors font-semibold"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              Découvrir les produits
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

