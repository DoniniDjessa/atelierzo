'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Black_Ops_One } from 'next/font/google';

const blackOps = Black_Ops_One({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
});

const slides = [
  { id: 1, image: '/carousel/1.jpeg' },
  { id: 2, image: '/carousel/2.jpeg' },
  { id: 3, image: '/carousel/3.jpeg' },
  { id: 4, image: '/carousel/4.jpeg' },
  { id: 5, image: '/carousel/5.jpeg' },
  { id: 6, image: '/carousel/6.jpeg' },
  { id: 7, image: '/carousel/7.jpeg' },
  { id: 8, image: '/carousel/8.jpeg' },
];

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showRestockBanner, setShowRestockBanner] = useState(false);

  // Check if we should show the restock banner
  useEffect(() => {
    const checkRestockBanner = () => {
      const now = new Date();
      // Restock date: January 6, 2026 at 10:00 AM GMT
      const restockDate = new Date('2026-01-06T10:00:00Z');
      setShowRestockBanner(now < restockDate);
    };
    
    checkRestockBanner();
    // Check every minute to update the banner visibility
    const interval = setInterval(checkRestockBanner, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <section className="relative w-full h-[60vh] min-h-[500px] max-h-[700px] mb-24 bg-gray-900">
      {/* Restock Announcement Banner */}
      {showRestockBanner && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-40 px-8 py-6 rounded-2xl shadow-2xl text-center max-w-xl w-[90%] overflow-hidden">
          <div 
            className="absolute inset-0 animate-shimmer"
            style={{
              background: 'linear-gradient(90deg, #00aeee 0%, #00d4ff 50%, #00aeee 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 3s linear infinite'
            }}
          />
          <style jsx>{`
            @keyframes shimmer {
              0% {
                background-position: -200% 0;
              }
              100% {
                background-position: 200% 0;
              }
            }
          `}</style>
          <div className="relative z-10">
            <h2 className={`${blackOps.className} text-3xl md:text-4xl text-white mb-2 flex items-center justify-center gap-3`}>
              PROCHAIN RESTOCKAGE EN LIGNE
              {/* <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 md:w-10 md:h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>
              </svg> */}
            </h2>
            <p className="text-sm md:text-base text-white">
              Mardi 06 Janvier 2026 - 11h00 GMT
            </p>
          </div>
        </div>
      )}
      {/* Mobile/Tablet Carousel (< 1024px) */}
      <div className="block lg:hidden w-full h-full relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
          >
            <Image
              src={slides[currentSlide].image}
              alt="Carousel Slide"
              fill
              className="object-cover object-top"
              priority
              unoptimized
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/10" />
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors z-10"
          aria-label="Previous slide"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors z-10"
          aria-label="Next slide"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Desktop Static Image (>= 1024px) */}
      <div className="hidden lg:block w-full h-full relative overflow-hidden">
        <Image
          src="/cover.webp"
          alt="Les Ateliers Zo"
          fill
          className="object-cover object-top"
          priority
          unoptimized
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {/* Floating Card - Visible on all devices */}
      <div className="absolute bottom-0 shadow-sm rounded-3xl left-1/2 -translate-x-1/2 translate-y-[30%] z-30 w-62 md:w-72 lg:w-80">
         <img
            src="/cover-card.webp"
            alt="Special Offer"
            className="w-full"
          />
      </div>
    </section>
  );
}
