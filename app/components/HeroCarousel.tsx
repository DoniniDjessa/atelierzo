"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const slides = [
  { id: 1, image: "/carousel/1.jpeg" },
  { id: 2, image: "/carousel/2.jpeg" },
  { id: 3, image: "/carousel/3.jpeg" },
  { id: 4, image: "/carousel/4.jpeg" },
  { id: 5, image: "/carousel/5.jpeg" },
  { id: 6, image: "/carousel/6.jpeg" },
  { id: 7, image: "/carousel/7.jpeg" },
  { id: 8, image: "/carousel/8.jpeg" },
];

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showRestockBanner, setShowRestockBanner] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Check if we should show the restock banner and calculate countdown
  useEffect(() => {
    const checkRestockBanner = () => {
      const now = new Date();
      // Restock date: Thursday, January 9, 2026 at 11:00 AM GMT
      const restockDate = new Date("2026-01-09T11:00:00Z");

      if (now < restockDate) {
        setShowRestockBanner(true);

        // Calculate time remaining
        const diff = restockDate.getTime() - now.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setTimeRemaining({ days, hours, minutes, seconds });
      } else {
        setShowRestockBanner(false);
      }
    };

    checkRestockBanner();
    // Check every second to update the countdown
    const interval = setInterval(checkRestockBanner, 1000);
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
      {/* Restock Announcement Banner with Countdown */}
      {showRestockBanner && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 px-2 py-1.5 rounded-md shadow-lg text-center max-w-xs w-auto overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, #00aeee 0%, #00d4ff 50%, #00aeee 100%)",
              backgroundSize: "200% 100%",
              animation:
                "shimmer 3s linear infinite, blink 0.6s ease-in-out infinite",
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
            @keyframes blink {
              0%,
              100% {
                opacity: 1;
              }
              50% {
                opacity: 0.7;
              }
            }
          `}</style>
          <div className="relative z-10">
            <h2
              className="text-[10px] md:text-xs font-bold text-white mb-1 flex items-center justify-center gap-1"
              style={{ fontFamily: "Arial, sans-serif" }}
            >
              PROCHAIN RESTOCKAGE EN LIGNE
            </h2>
            <p
              className="text-[8px] md:text-[9px] text-white font-medium mb-1"
              style={{ fontFamily: "Arial, sans-serif" }}
            >
              Ven 09 Jan 2026 - 09h00
            </p>
            {/* Countdown Timer */}
            <div className="flex justify-center gap-1 text-white">
              <div className="flex flex-col items-center bg-white/20 rounded px-1 py-0.5">
                <span className="text-xs md:text-sm font-bold">
                  {timeRemaining.days}
                </span>
                <span className="text-[7px] md:text-[8px] uppercase">
                  Jours
                </span>
              </div>
              <div className="flex flex-col items-center bg-white/20 rounded px-1 py-0.5">
                <span className="text-xs md:text-sm font-bold">
                  {String(timeRemaining.hours).padStart(2, "0")}
                </span>
                <span className="text-[7px] md:text-[8px] uppercase">Hrs</span>
              </div>
              <div className="flex flex-col items-center bg-white/20 rounded px-1 py-0.5">
                <span className="text-xs md:text-sm font-bold">
                  {String(timeRemaining.minutes).padStart(2, "0")}
                </span>
                <span className="text-[7px] md:text-[8px] uppercase">Min</span>
              </div>
              <div className="flex flex-col items-center bg-white/20 rounded px-1 py-0.5">
                <span className="text-xs md:text-sm font-bold">
                  {String(timeRemaining.seconds).padStart(2, "0")}
                </span>
                <span className="text-[7px] md:text-[8px] uppercase">Sec</span>
              </div>
            </div>
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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors z-10"
          aria-label="Next slide"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
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
        <img src="/cover-card.webp" alt="Special Offer" className="w-full" />
      </div>
    </section>
  );
}
