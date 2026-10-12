"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getAllHeroSlides, HeroSlide } from "@/app/lib/supabase/hero-slides";

const AUTOPLAY_MS = 3500;
const GAP_PX = 0; // pictures touch each other; the strip itself has the rounded corners

// How many portrait (3:4) pictures fit side by side: exactly 1 on phones, up to 4 on wide screens
function slidesPerView(width: number) {
  if (width >= 1280) return 4;
  if (width >= 1024) return 3;
  if (width >= 640) return 2;
  return 1;
}

export default function HeroCarousel() {
  const [slides, setSlides] = useState<HeroSlide[] | null>(null); // null while loading
  const [showRestockBanner, setShowRestockBanner] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Pictures are managed in /pilotage/hero
  useEffect(() => {
    getAllHeroSlides().then(({ data }) => setSlides(data.filter((slide) => slide.is_active)));
  }, []);

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

  // No visible picture (all hidden/deleted in /pilotage/hero): no carousel at all
  if (slides && slides.length === 0 && !showRestockBanner) return null;

  return (
    <section className="relative w-full mb-6 bg-linear-to-b from-white to-gray-50 dark:from-black dark:to-black">
      {/* Restock Announcement Banner with Countdown */}
      {showRestockBanner && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 px-2 py-1.5 rounded-md shadow-lg text-center max-w-xs w-auto overflow-hidden">
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
              Ven 09 Jan 2026 - 17h00.
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

      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-2">
        <SlideTrack slides={slides ?? []} />
      </div>
    </section>
  );
}

function SlideTrack({ slides }: { slides: HeroSlide[] }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [windowWidth, setWindowWidth] = useState(0); // 0 until mounted, so server and first client render match
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const drag = useRef<{ startX: number; dx: number } | null>(null);
  const justDragged = useRef(false); // swallows the click that ends a swipe on a linked picture
  const [dragOffset, setDragOffset] = useState(0);

  // Track the viewport width to size the slides in pixels
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => {
      setWidth(el.getBoundingClientRect().width);
      setWindowWidth(window.innerWidth);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const onChange = () => setReducedMotion(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const count = slides.length;
  const perView = slidesPerView(windowWidth);
  const slideWidth = width ? (width - GAP_PX * (perView - 1)) / perView : 0;
  const step = slideWidth + GAP_PX;
  const maxIndex = Math.max(0, count - perView);
  const canSlide = maxIndex > 0;
  // The last position aligns the last picture with the right edge (no empty space after it)
  const trackWidth = count * step - GAP_PX;
  const offset = Math.min(index * step, Math.max(0, trackWidth - width));

  useEffect(() => {
    if (index > maxIndex) setIndex(maxIndex);
  }, [index, maxIndex]);

  const go = useCallback(
    (direction: 1 | -1) => setIndex((i) => (direction === 1 ? (i >= maxIndex ? 0 : i + 1) : i <= 0 ? maxIndex : i - 1)),
    [maxIndex]
  );

  useEffect(() => {
    if (!canSlide || paused || reducedMotion) return;
    const timer = setTimeout(() => go(1), AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [index, canSlide, paused, reducedMotion, go]);

  // Swipe / drag
  const onPointerDown = (e: React.PointerEvent) => {
    if (!canSlide) return;
    drag.current = { startX: e.clientX, dx: 0 };
    setPaused(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    drag.current.dx = e.clientX - drag.current.startX;
    setDragOffset(drag.current.dx);
  };
  const endDrag = () => {
    if (!drag.current) return;
    const { dx } = drag.current;
    drag.current = null;
    justDragged.current = Math.abs(dx) > 5;
    setDragOffset(0);
    setPaused(false);
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
  };

  return (
    <div
      className="group/hero relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      aria-roledescription="carrousel"
      aria-label="Nouveautés Les Ateliers Zo"
    >
      <div
        ref={viewportRef}
        className="overflow-hidden rounded-2xl shadow-[0_10px_30px_-15px_rgba(0,0,0,0.4)] touch-pan-y select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
      >
        {/* Placeholder with roughly the final height until pictures and width are known */}
        {(count === 0 || !slideWidth) && <div className="aspect-[3/4] sm:aspect-[3/2] lg:aspect-[2/1] xl:aspect-[8/3] rounded-2xl bg-gray-100 dark:bg-gray-900 animate-pulse" />}
        {count > 0 && slideWidth > 0 && (
        <div
          className={`flex ${canSlide ? "" : "justify-center"}`}
          style={{
            gap: GAP_PX,
            transform: `translate3d(${-offset + dragOffset}px, 0, 0)`,
            transition: dragOffset !== 0 ? "none" : "transform 550ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {slides.map((slide, i) => {
            const visible = i * step >= offset - 1 && i * step < offset + width;
            const card = (
              <div className="relative aspect-[3/4] lg:aspect-[2/3] overflow-hidden bg-gray-100 dark:bg-gray-900">
                <Image
                  src={slide.image_url}
                  alt={`Les Ateliers Zo – image ${i + 1}`}
                  fill
                  sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover object-top transition-transform duration-[1200ms] ease-out hover:scale-[1.04]"
                  priority={i < 4}
                  draggable={false}
                  unoptimized
                />
                {/* Soft bottom shade for depth */}
                <div className="absolute inset-x-0 bottom-0 h-1/4 bg-linear-to-t from-black/25 to-transparent pointer-events-none" />
              </div>
            );
            return (
              <div
                key={slide.id}
                className="shrink-0"
                style={{ width: slideWidth }}
                aria-roledescription="diapositive"
                aria-label={`${i + 1} sur ${count}`}
                aria-hidden={!visible}
              >
                {slide.link_url ? (
                  <Link href={slide.link_url} tabIndex={visible ? 0 : -1} onClick={(e) => {
                      if (justDragged.current) e.preventDefault();
                    }}>
                    {card}
                  </Link>
                ) : (
                  card
                )}
              </div>
            );
          })}
        </div>
        )}
      </div>

      {canSlide && (
        <>
          {/* Arrows (phones swipe instead) */}
          {([-1, 1] as const).map((direction) => (
            <button
              key={direction}
              onClick={() => go(direction)}
              className={`hidden sm:flex absolute top-1/2 -translate-y-1/2 ${direction === -1 ? "-left-3 lg:-left-4" : "-right-3 lg:-right-4"} z-10 h-11 w-11 items-center justify-center rounded-full bg-white/95 text-gray-900 shadow-lg ring-1 ring-black/5 transition hover:bg-white hover:scale-105 dark:bg-gray-900/95 dark:text-white dark:ring-white/10 opacity-90 group-hover/hero:opacity-100`}
              aria-label={direction === -1 ? "Images précédentes" : "Images suivantes"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={direction === -1 ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
              </svg>
            </button>
          ))}

          {/* Position dots; the active one fills up until the next slide */}
          <div className="mt-4 flex items-center justify-center gap-1.5">
            {Array.from({ length: maxIndex + 1 }, (_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`relative h-1.5 overflow-hidden rounded-full transition-all duration-300 ${
                  i === index ? "w-8 bg-gray-200 dark:bg-gray-800" : "w-1.5 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700"
                }`}
                aria-label={`Aller à la position ${i + 1}`}
                aria-current={i === index}
              >
                {i === index && (
                  <span
                    key={`${index}-${paused}`}
                    className="absolute inset-0 origin-left rounded-full bg-[#00aeee]"
                    style={
                      paused || reducedMotion
                        ? undefined
                        : { animation: `hero-progress ${AUTOPLAY_MS}ms linear forwards` }
                    }
                  />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
