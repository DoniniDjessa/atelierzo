'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useCart } from '@/app/contexts/CartContext';

export default function FloatingCartButton() {
  const router = useRouter();
  const pathname = usePathname();
  const { getItemCount } = useCart();
  const itemCount = getItemCount();

  // Don't show on cart page or if cart is empty
  if (itemCount === 0 || pathname === '/cart') {
    return null;
  }

  return (
    <button
      onClick={() => router.push('/cart')}
      className="fixed bottom-20 right-6 bg-linear-to-r from-cyan-500 to-cyan-700 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 active:scale-95 transition-all duration-300 z-50 flex items-center justify-center group"
      style={{ fontFamily: 'var(--font-poppins)' }}
      aria-label="Voir le panier"
    >
      {/* Cart Icon */}
      <div className="relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        {/* Counter Badge */}
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold min-w-5 h-5 rounded-full flex items-center justify-center px-1.5 animate-pulse">
          {itemCount}
        </span>
      </div>
      {/* Tooltip on hover */}
      <span className="absolute right-full mr-3 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        Voir le panier ({itemCount} article{itemCount > 1 ? 's' : ''})
      </span>
    </button>
  );
}
