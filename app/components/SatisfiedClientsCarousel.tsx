'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { getAllSatisfiedClients, SatisfiedClient } from '@/app/lib/supabase/satisfied-clients';

export default function SatisfiedClientsCarousel() {
  const [clients, setClients] = useState<SatisfiedClient[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    const { data } = await getAllSatisfiedClients();
    if (data) {
      setClients(data);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clients.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % clients.length);
    }, 5000); // Auto-slide every 5 seconds
    return () => clearInterval(interval);
  }, [clients.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + clients.length) % clients.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % clients.length);
  };

  if (loading) {
    return null;
  }

  if (clients.length === 0) {
    return null;
  }

  return (
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-black">
      <div className="max-w-7xl mx-auto">
        {/* Title */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Image
            src="/logo.png"
            alt="Les Ateliers Zo"
            width={60}
            height={20}
            className="h-8 w-auto object-contain"
            priority
            unoptimized
          />
          <h2
            className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-cyan-700 bg-clip-text text-transparent"
            style={{ fontFamily: 'var(--font-ubuntu)' }}
          >
            Clients satisfaits
          </h2>
        </div>
        
        <div className="flex justify-center">
          <div className="w-full sm:max-w-[50vw] 2xl:max-w-[1000px]">
            <div className="relative">
          {/* Carousel Container */}
          <div className="relative overflow-hidden rounded-2xl">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {clients.map((client) => (
                <div key={client.id} className="min-w-full">
                  <div className="relative w-full aspect-[4/3] max-h-[500px]">
                    <Image
                      src={client.image_url}
                      alt={client.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                      priority={clients.indexOf(client) === currentIndex}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Arrows */}
          {clients.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 rounded-full p-3 shadow-lg transition-all z-10"
                aria-label="Previous"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-gray-800 dark:text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 rounded-full p-3 shadow-lg transition-all z-10"
                aria-label="Next"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-gray-800 dark:text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Dots Indicator */}
          {clients.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {clients.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentIndex
                      ? 'w-8 bg-white'
                      : 'w-2 bg-white/50 hover:bg-white/75'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
          </div>
        </div>
      </div>
    </section>
  );
}

