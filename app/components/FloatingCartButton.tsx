'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useCart } from '@/app/contexts/CartContext';

// 20 000 -> "20k", 22 500 -> "22,5k", 950 -> "950"
function formatCompactAmount(amount: number) {
  if (amount < 1000) return amount.toLocaleString('fr-FR');
  return `${(Math.round(amount / 100) / 10).toLocaleString('fr-FR')}k`;
}

export default function FloatingCartButton() {
  const router = useRouter();
  const pathname = usePathname();
  const { getItemCount, getTotal } = useCart();
  const itemCount = getItemCount();
  const total = getTotal();

  // Don't show on cart page or if cart is empty
  if (itemCount === 0 || pathname === '/cart') {
    return null;
  }

  return (
    <button
      onClick={() => router.push('/cart')}
      className="fixed bottom-20 right-4 sm:right-6 z-50 flex items-center gap-2 sm:gap-3 rounded-full bg-linear-to-r from-cyan-500 to-cyan-700 py-3 pl-3.5 pr-4 sm:py-2 sm:pl-2 text-white shadow-xl shadow-cyan-900/30 ring-1 ring-white/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl active:scale-95"
      style={{ fontFamily: 'var(--font-poppins)' }}
      aria-label={`Voir le panier (${itemCount} article${itemCount > 1 ? 's' : ''})`}
    >
      {/* Cart Icon + Counter */}
      <span className="relative flex shrink-0 items-center justify-center sm:h-11 sm:w-11 sm:rounded-full sm:bg-white/15">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <span className="absolute -top-2.5 -right-2.5 sm:-top-1 sm:-right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold ring-2 ring-cyan-600">
          {itemCount}
        </span>
      </span>

      {/* Total */}
      <span className="flex flex-col items-start leading-tight">
        <span className="hidden text-[10px] font-medium uppercase tracking-wide text-cyan-50/90 sm:inline">
          Voir le panier
        </span>
        {/* Compact amount on mobile keeps the pill small */}
        <span className="text-sm font-bold sm:hidden">{formatCompactAmount(total)}</span>
        <span className="hidden text-sm font-bold sm:inline">{total.toLocaleString('fr-FR')} FCFA</span>
      </span>

      {/* Arrow */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="hidden h-4 w-4 shrink-0 opacity-80 sm:block"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}
