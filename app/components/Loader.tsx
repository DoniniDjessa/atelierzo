'use client';

import { useEffect, useState } from 'react';

export default function Loader() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white dark:bg-black transition-opacity duration-500">
      <div className="flex flex-col items-center gap-6">
        {/* Logo with pulse animation */}
        <img
          src="/logo.png"
          alt="Les Ateliers Zo"
          className="h-16 w-auto object-contain animate-pulse"
          style={{ maxWidth: '180px', height: 'auto' }}
        />
        
        {/* Loading dots */}
        <div className="flex gap-1.5">
          <div className="h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-bounce [animation-delay:-0.3s]"></div>
          <div className="h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-bounce [animation-delay:-0.15s]"></div>
          <div className="h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-bounce"></div>
        </div>
      </div>
    </div>
  );
}

