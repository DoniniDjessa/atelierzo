'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';

export default function FloatingDestockageBulle() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);

  if (!visible || pathname?.startsWith('/pilotage')) {
    return null;
  }

  return (
    <div
      className="fixed top-20 left-1/2 z-40 -translate-x-1/2 px-3"
      role="status"
      aria-live="polite"
    >
      <div
        className="destockage-float destockage-blink relative flex items-center gap-2 whitespace-nowrap rounded-xl border border-cyan-300/40 bg-linear-to-r from-cyan-500 to-cyan-700 px-5 py-2.5 pr-9 text-xs font-semibold tracking-wide text-white uppercase shadow-lg shadow-cyan-700/30 sm:rounded-2xl sm:px-6 sm:text-sm"
        style={{ fontFamily: 'var(--font-poppins)' }}
      >
        <span
          className="h-2 w-2 shrink-0 rounded-full bg-white/90"
          aria-hidden
        />
        <span className="whitespace-nowrap">Prochain restockage le 30 juillet</span>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-md text-white/90 hover:bg-white/20 hover:text-white"
          aria-label="Fermer l'annonce"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
