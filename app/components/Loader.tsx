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
      <div className="flex flex-col items-center gap-4">
        {/* Pulse animation for text */}
        <div className="flex items-center gap-2">
          <span 
            className="text-xl font-semibold animate-pulse"
            style={{ fontFamily: 'var(--font-ubuntu)' }}
          >
            Atelierzo
          </span>
        </div>
        
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

