'use client';

import NextImage from 'next/image';
import { useFavorites } from '@/app/contexts/FavoritesContext';
import { PREORDER_PRODUCT_ID } from './PreorderModal';

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
  isOutOfStock?: boolean;
  onFavoriteToggle?: () => void;
  onAddToCart?: () => void;
  onPreorderClick?: () => void;
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
  isOutOfStock = false,
  onFavoriteToggle,
  onAddToCart,
  onPreorderClick,
  onClick,
}: ProductCardProps) {
  const favorites = useFavorites();
  const isFav = productId ? favorites.isFavorite(productId) : (propIsFavorite || false);
  const hasDiscount = oldPrice !== undefined && oldPrice > price;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (productId) {
      favorites.toggleFavorite(productId);
    }
    onFavoriteToggle?.();
  };

  return (
    <div
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-700/80 dark:bg-gray-800 ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-gray-100 dark:bg-gray-700">
        <NextImage
          src={imageUrl}
          alt={title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          unoptimized={imageUrl.includes('unsplash.com') || imageUrl.includes('placehold.co')}
        />
        {hasDiscount && (
          <span className="absolute left-2 top-2 rounded-full bg-[#B9F19D] px-2.5 py-1 text-[10px] font-bold text-gray-900 shadow-sm sm:left-3 sm:top-3 sm:text-xs">
            -{Math.round(((oldPrice - price) / oldPrice) * 100)}%
          </span>
        )}
        {/* Out of Stock Overlay on Image */}
        {isOutOfStock && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 dark:bg-black/70">
            <span
              className="rounded-full border border-white/30 bg-black/30 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm sm:text-sm"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              Rupture de stock
            </span>
          </div>
        )}
      </div>

      {/* Top Right Actions */}
      <div className="absolute right-2 top-2 z-10 flex items-center gap-2 sm:right-3 sm:top-3">
        {/* Preorder Badge/Button */}
        {isOutOfStock && productId === PREORDER_PRODUCT_ID && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onPreorderClick) {
                onPreorderClick();
              } else if (onClick) {
                onClick(); // Default to viewing the product
              }
            }}
            className="px-2 py-1 sm:px-3 sm:py-1.5 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-[10px] sm:text-xs font-bold rounded-full shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1"
            style={{ fontFamily: 'var(--font-poppins)' }}
            aria-label="Précommander"
          >
            <span>📋</span> Précommander
          </button>
        )}

        {/* Favorite Badge */}
        <button
          onClick={handleFavoriteClick}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition-colors hover:bg-white dark:bg-gray-800/90 dark:hover:bg-gray-800 sm:h-9 sm:w-9"
          aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          aria-pressed={isFav}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-3 w-3 sm:h-3.5 sm:w-3.5 transition-colors ${isFav ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
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
      </div>

      {/* Content Section */}
      <div className="flex shrink-0 flex-1 flex-col p-3 sm:p-4">
        {/* Product Title */}
        <h3
          className="mb-2 line-clamp-2 min-h-10 text-sm font-bold leading-5 text-gray-900 dark:text-white sm:mb-3 sm:text-base"
          style={{ fontFamily: 'var(--font-ubuntu)' }}
        >
          {title}
        </h3>

        {!isOutOfStock && (colors.length > 0 || sizes.length > 0) && (
          <div className="mb-2 flex min-h-5 flex-wrap items-center gap-1.5 sm:mb-3 sm:gap-2">
            {colors.length > 0 &&
              colors.slice(0, 5).map((color, index) => (
                <span
                  key={`${color}-${index}`}
                  className="h-3.5 w-3.5 rounded-full border border-gray-200 dark:border-gray-600 sm:h-4 sm:w-4"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            {sizes.slice(0, 4).map((size, index) => (
              <span
                key={`${size}-${index}`}
                className="rounded border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600 dark:border-gray-600 dark:text-gray-400 sm:text-xs"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                {size}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto border-t border-gray-100 pt-2 dark:border-gray-700 sm:pt-3">
          <div className="flex min-h-6 flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
            {hasDiscount && (
              <span
                className="text-[10px] text-gray-400 line-through dark:text-gray-500 sm:text-xs"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                {oldPrice.toLocaleString('fr-FR')} XOF
              </span>
            )}
            <span
              className="ml-auto text-sm font-bold text-gray-950 dark:text-white sm:text-base"
              style={{ fontFamily: 'var(--font-ubuntu)' }}
            >
              {price.toLocaleString('fr-FR')} XOF
            </span>
          </div>

          {!hideAddToCart && !isOutOfStock && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart?.();
              }}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-700 px-2 py-2 text-white transition-all hover:from-cyan-600 hover:to-cyan-800 active:scale-[0.98] sm:mt-3"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              <span className="text-[10px] font-medium sm:text-xs">
                Ajouter au panier
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3 sm:h-3.5 sm:w-3.5"
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
