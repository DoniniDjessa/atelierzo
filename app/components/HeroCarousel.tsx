'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

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
