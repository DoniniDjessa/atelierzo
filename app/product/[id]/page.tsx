'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import { useProducts } from '@/app/contexts/ProductContext';
import { useCart } from '@/app/contexts/CartContext';
import { getColorName } from '@/app/lib/utils/colors';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const { getProductById } = useProducts();
  const product = getProductById(productId);
  const { addToCart } = useCart();
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <h1
            className="text-2xl font-bold text-black dark:text-white mb-4"
                  style={{ fontFamily: 'var(--font-ubuntu)' }}
          >
            Produit non trouvé
          </h1>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (selectedSizes.length === 0) {
      toast.error('Veuillez sélectionner au moins une taille');
      return;
    }

    // Add each size-color combination to cart
    selectedSizes.forEach((size) => {
      const color = selectedColors.length > 0 ? selectedColors[0] : undefined; // Use first selected color or undefined
      addToCart({
        productId: product.id,
        title: product.title,
        price: product.price,
        imageUrl: product.imageUrl,
        size,
        color,
      });
    });

    const sizesText = selectedSizes.length > 1 ? `tailles ${selectedSizes.join(', ')}` : `taille ${selectedSizes[0]}`;
    const colorsText = selectedColors.length > 0 ? ` - Couleurs: ${selectedColors.map(c => getColorName(c) || c).join(', ')}` : '';
    toast.success(`Produit ajouté au panier ! ${sizesText}${colorsText}`);
    router.push('/cart');
  };

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const toggleColor = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
          style={{ fontFamily: 'var(--font-poppins)' }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Retour</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Image */}
          <div className="relative w-full aspect-square bg-white dark:bg-gray-800 rounded-2xl overflow-hidden">
            <Image
              src={product.imageUrl}
              alt={product.title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
              unoptimized={product.imageUrl.includes('unsplash.com')}
            />
            {/* Favorite Button */}
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm flex items-center justify-center hover:bg-white dark:hover:bg-gray-800 transition-colors z-10 shadow-lg"
              aria-label="Add to favorites"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-5 w-5 transition-colors ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                fill={isFavorite ? 'currentColor' : 'none'}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </button>
          </div>

          {/* Product Details */}
          <div className="flex flex-col">
            {/* Title */}
            <h1
              className="text-xl sm:text-2xl font-bold text-black dark:text-white mb-2"
                  style={{ fontFamily: 'var(--font-ubuntu)' }}
            >
              {product.title}
            </h1>

            {/* Description */}
            <p
              className="text-xs text-gray-600 dark:text-gray-400 mb-4 leading-relaxed"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              {product.description}
            </p>

            {/* Price */}
            <div className="flex items-center gap-2 mb-6">
              {product.oldPrice && (
                <span
                  className="text-sm text-gray-400 dark:text-gray-500 line-through"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  {product.oldPrice.toLocaleString('fr-FR')} FCFA
                </span>
              )}
              <span
                className="text-xl font-bold text-black dark:text-white"
                  style={{ fontFamily: 'var(--font-ubuntu)' }}
              >
                {product.price.toLocaleString('fr-FR')} FCFA
              </span>
            </div>

            {/* Size Selection */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="mb-4">
                <label
                  className="block text-xs font-semibold text-black dark:text-white mb-2"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  Tailles {selectedSizes.length > 0 && <span className="text-gray-500">({selectedSizes.join(', ')})</span>}
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => toggleSize(size)}
                      className={`px-4 py-2 text-xs border-2 rounded-lg font-medium transition-all ${
                        selectedSizes.includes(size)
                          ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                          : 'border-gray-300 dark:border-gray-600 text-black dark:text-white hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Selection */}
            {product.colors && product.colors.length > 0 && (
              <div className="mb-6">
                <label
                  className="block text-xs font-semibold text-black dark:text-white mb-2"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  Couleurs {selectedColors.length > 0 && <span className="text-gray-500">({selectedColors.length} sélectionnée(s))</span>}
                </label>
                <div className="flex gap-2">
                  {product.colors.map((color, index) => (
                    <button
                      key={index}
                      onClick={() => toggleColor(color)}
                      className={`w-10 h-10 rounded-full border-2 transition-all ${
                        selectedColors.includes(color)
                          ? 'border-black dark:border-white scale-110 ring-2 ring-offset-2 ring-black dark:ring-white'
                          : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Color ${color}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Stock Status */}
            {!product.inStock && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p
                  className="text-xs text-red-600 dark:text-red-400 font-medium"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  En rupture de stock
                </p>
              </div>
            )}

            {/* Add to Cart Button */}
            <button
              onClick={handleAddToCart}
              disabled={!product.inStock || selectedSizes.length === 0}
              className={`w-full py-3 px-4 rounded-xl text-xs font-semibold text-white transition-all transform ${
                !product.inStock || selectedSizes.length === 0
                  ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-500 hover:to-cyan-500 hover:scale-105 active:scale-95'
              }`}
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              {!product.inStock
                ? 'Produit indisponible'
                : selectedSizes.length === 0
                ? 'Sélectionnez une taille'
                : 'Ajouter au panier'}
            </button>

            {/* Additional Info */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
              <div className="space-y-3">
                <div>
                  <h3
                    className="text-xs font-semibold text-black dark:text-white mb-1"
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    Livraison
                  </h3>
                  <p
                    className="text-xs text-gray-600 dark:text-gray-400"
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    Livraison gratuite à partir de 50 000 FCFA
                  </p>
                </div>
                <div>
                  <h3
                    className="text-xs font-semibold text-black dark:text-white mb-1"
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    Retour
                  </h3>
                  <p
                    className="text-xs text-gray-600 dark:text-gray-400"
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    Retour gratuit sous 14 jours
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

