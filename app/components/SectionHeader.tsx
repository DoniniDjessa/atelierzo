'use client';

import Link from 'next/link';

interface SectionHeaderProps {
  title: string;
  count: number;
  href: string;
}

export default function SectionHeader({ title, count, href }: SectionHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#B9F19D] font-bold flex-wrap">
        <span className="text-black break-words" style={{ fontFamily: 'var(--font-poppins)' }}>
          {title}
        </span>
        <span className="bg-black text-white text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
          {count}
        </span>
      </div>
      <Link
        href={href}
        className="inline-flex items-center gap-1 text-sm font-semibold text-gray-900 dark:text-gray-100 underline underline-offset-4 decoration-2 decoration-[#00aeee] hover:text-[#00aeee] transition-colors"
        style={{ fontFamily: 'var(--font-poppins)' }}
      >
        Afficher tout
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </Link>
    </div>
  );
}
