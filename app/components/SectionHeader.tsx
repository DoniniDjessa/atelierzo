'use client';

import Link from 'next/link';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  count: number;
  href: string;
}

export default function SectionHeader({ title, subtitle, count, href }: SectionHeaderProps) {
  const titleSizeClass =
    title.length > 32
      ? 'text-base sm:text-lg'
      : title.length > 22
        ? 'text-lg sm:text-xl'
        : 'text-xl sm:text-2xl';

  return (
    <div className="mb-5 sm:mb-6">
      {/* Phones: title, then "Afficher tout", then the description. md+: "Afficher tout" right after the title */}
      <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:gap-4">
        <div className="flex min-w-0 items-stretch gap-2.5">
          <span className="min-h-6 w-1.5 shrink-0 rounded-full bg-[#00aeee]" aria-hidden="true" />
          <h2
            className={`min-w-0 flex-1 md:flex-none break-words font-bold uppercase leading-tight tracking-tight text-gray-950 dark:text-white ${titleSizeClass}`}
            style={{ fontFamily: 'var(--font-ubuntu)' }}
          >
            {title}
          </h2>
          {/* Phones: counter next to the title (md+: inside the button) */}
          <span className="shrink-0 self-start whitespace-nowrap rounded-full bg-[#B9F19D] px-2.5 py-1 text-xs font-bold text-gray-900 md:hidden">
            {count}
          </span>
        </div>
        <Link
          href={href}
          className="group ml-4 inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-gray-200 py-1.5 pl-3.5 pr-1.5 text-xs font-semibold text-gray-800 transition-colors hover:border-[#00aeee] hover:text-[#0088b8] dark:border-gray-700 dark:text-gray-100 dark:hover:text-cyan-300 sm:text-sm md:ml-0 md:self-auto"
          style={{ fontFamily: 'var(--font-poppins)' }}
          aria-label={`Afficher tout : ${count} produit${count > 1 ? 's' : ''}`}
        >
          {/* Underlined from md up only */}
          <span className="md:underline decoration-[#00aeee] decoration-2 underline-offset-4">Afficher tout</span>
          {/* md+: counter inside the button */}
          <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-[#B9F19D] px-2 py-0.5 text-xs font-bold text-gray-900">
            {count}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
          {/* Phones: arrow only */}
          <svg xmlns="http://www.w3.org/2000/svg" className="mr-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5 md:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>
      {subtitle && (
        <p className="mt-2 pl-4 text-xs leading-relaxed text-gray-500 dark:text-gray-400 sm:text-sm">
          {subtitle}
        </p>
      )}
    </div>
  );
}
