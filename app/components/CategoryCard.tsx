'use client';

import Image from 'next/image';

interface CategoryCardProps {
  title: string;
  imageUrl: string;
  onClick?: () => void;
}

export default function CategoryCard({
  title,
  imageUrl,
  onClick,
}: CategoryCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden group relative"
    >
      {/* Category Image */}
      <div className="relative w-full h-32 bg-gray-100 dark:bg-gray-700">
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 768px) 50vw, 33vw"
          unoptimized={imageUrl.includes('unsplash.com')}
        />
      </div>

      {/* Category Title */}
      <div className="p-3">
        <h3
          className="text-sm font-semibold text-black dark:text-white text-center line-clamp-1"
          style={{ fontFamily: 'var(--font-fira-sans)' }}
        >
          {title}
        </h3>
      </div>
    </div>
  );
}

