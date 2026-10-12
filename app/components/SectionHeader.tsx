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
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4 sm:mb-6">
      <div className="min-w-0">
        <div className="mb-1.5 flex min-w-0 items-stretch gap-2.5">
          <span className="min-h-6 w-1.5 shrink-0 rounded-full bg-[#00aeee]" aria-hidden="true" />
          <h2
            className={`min-w-0 flex-1 break-words font-bold uppercase leading-tight tracking-tight text-gray-950 dark:text-white ${titleSizeClass}`}
            style={{ fontFamily: 'var(--font-ubuntu)' }}
          >
            {title}
          </h2>
          <span className="shrink-0 self-start whitespace-nowrap rounded-full bg-[#B9F19D] px-2.5 py-1 text-xs font-bold text-gray-900">
            {count}
          </span>
        </div>
        {subtitle && (
          <p className="pl-4 text-xs leading-relaxed text-gray-500 dark:text-gray-400 sm:text-sm">
            {subtitle}
          </p>
        )}
      </div>
      <Link
        href={href}
        className="inline-flex shrink-0 items-center gap-2 rounded-full border border-gray-200 px-3.5 py-2 text-xs font-semibold text-gray-800 transition-colors hover:border-[#00aeee] hover:text-[#0088b8] dark:border-gray-700 dark:text-gray-100 dark:hover:text-cyan-300 sm:text-sm"
        style={{ fontFamily: 'var(--font-poppins)' }}
      >
        Afficher tout
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </Link>
    </div>
  );
}
