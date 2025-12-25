'use client';

import Image from 'next/image';
import { useFavorites } from '@/app/contexts/FavoritesContext';

interface ProductCardProps {
  productId?: string;
  title: string;
  description: string;
  price: number;
  oldPrice?: number;
  imageUrl: string;
  colors?: string[];
  sizes?: string[];
  isFavorite?: boolean;
  hideAddToCart?: boolean;
  onFavoriteToggle?: () => void;
  onAddToCart?: () => void;
  onClick?: () => void;
}

export default function ProductCard({
  productId,
  title,
  description,
  price,
  oldPrice,
  imageUrl,
  colors = [],
  sizes = [],
  isFavorite: propIsFavorite,
  hideAddToCart = false,
  onFavoriteToggle,
  onAddToCart,
  onClick,
}: ProductCardProps) {
  const favorites = useFavorites();
  const isFav = productId ? favorites.isFavorite(productId) : (propIsFavorite || false);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (productId) {
      favorites.toggleFavorite(productId);
    }
    onFavoriteToggle?.();
  };

  return (
    <div 
      className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative flex flex-col h-full overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {/* Product Image - Takes more space, fills top area */}
      <div className="relative w-full flex-1 min-h-[320px] bg-gray-100 dark:bg-gray-700">
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          unoptimized={imageUrl.includes('unsplash.com') || imageUrl.includes('placehold.co')}
        />
      </div>

      {/* Favorite Badge */}
      <button
        onClick={handleFavoriteClick}
        className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm flex items-center justify-center hover:bg-white dark:hover:bg-gray-800 transition-colors z-10 shadow-sm"
        aria-label="Add to favorites"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-3.5 w-3.5 transition-colors ${isFav ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          fill={isFav ? 'currentColor' : 'none'}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      </button>

      {/* Content Section */}
      <div className="p-4 flex flex-col flex-shrink-0">
        {/* Product Title */}
      <h3
        className="text-base font-bold text-black dark:text-white mb-1 line-clamp-1"
                  style={{ fontFamily: 'var(--font-ubuntu)' }}
      >
        {title}
      </h3>

      {/* Product Description */}
      <p
        className="text-xs text-gray-400 dark:text-gray-500 mb-2 leading-tight line-clamp-2"
        style={{ fontFamily: 'var(--font-poppins)' }}
      >
        {description}
      </p>

      {/* Color or Size Selector */}
      {(colors.length > 0 || sizes.length > 0) && (
        <div className="flex gap-1.5 mb-3">
          {colors.length > 0 &&
            colors.map((color, index) => (
              <div
                key={index}
                className="w-4 h-4 rounded-full border border-gray-200 dark:border-gray-600"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          {sizes.length > 0 &&
            sizes.map((size, index) => (
              <span
                key={index}
                className="px-1.5 py-0.5 text-xs border border-gray-200 dark:border-gray-600 rounded text-gray-600 dark:text-gray-400"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                {size}
              </span>
            ))}
        </div>
      )}

      {/* Footer: Price and Add to Cart */}
      <div className="pt-3 border-t border-gray-100 dark:border-gray-700 mt-auto">
        {/* Prices */}
        <div className="flex items-center justify-between">
          {oldPrice && (
            <span
              className="text-xs text-gray-400 dark:text-gray-500 line-through"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              {oldPrice.toLocaleString('fr-FR')} FCFA
            </span>
          )}
          <span
            className="text-lg font-bold text-black dark:text-white"
                  style={{ fontFamily: 'var(--font-ubuntu)' }}
          >
            {price.toLocaleString('fr-FR')} FCFA
          </span>
        </div>

        {/* Add to Cart Button */}
        {!hideAddToCart && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart?.();
            }}
            className="w-full mt-3 bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-500 hover:to-cyan-500 text-white px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all transform hover:scale-105 active:scale-95"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            <span className="text-xs font-medium">Ajouter au panier</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
      </div>
    </div>
  );
}

