"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export type HeroSlide = {
  src: string;
  alt: string;
};

// Hook to read prefers-reduced-motion media query, updating on change.
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

const DWELL_MS = 5000;

type Props = {
  slides: ReadonlyArray<HeroSlide>;
};

export function HeroCarousel({ slides }: Props) {
  const [active, setActive] = useState(0);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [focusPaused, setFocusPaused] = useState(false);
  const reducedMotion = useReducedMotion();

  const paused = hoverPaused || focusPaused;
  const autoplay = !reducedMotion && !paused && slides.length > 1;

  useEffect(() => {
    if (!autoplay) return;
    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % slides.length);
    }, DWELL_MS);
    return () => clearInterval(id);
  }, [autoplay, slides.length]);

  const goTo = (index: number) =>
    setActive(((index % slides.length) + slides.length) % slides.length);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(active - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(active + 1);
    }
  }

  // Pause autoplay while any descendant has focus; resume when focus leaves the region.
  function onFocusIn() {
    setFocusPaused(true);
  }
  function onBlurOut(e: React.FocusEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setFocusPaused(false);
    }
  }

  return (
    <div
      role="region"
      aria-label="Hero image carousel"
      aria-roledescription="carousel"
      data-testid="hero-carousel"
      data-autoplay={autoplay ? "true" : "false"}
      tabIndex={0}
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
      onFocus={onFocusIn}
      onBlur={onBlurOut}
      onKeyDown={onKeyDown}
      className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-cf-divider bg-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Slide images — stacked, crossfade via opacity transition */}
      {slides.map((slide, i) => (
        <div
          key={`${slide.src}-${i}`}
          aria-roledescription="slide"
          aria-label={`Slide ${i + 1} of ${slides.length}`}
          aria-hidden={i !== active}
          className={[
            "absolute inset-0 transition-opacity",
            // Reduced-motion: no duration so the swap is instant, no animation
            reducedMotion ? "" : "duration-700",
            i === active ? "opacity-100" : "opacity-0",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            priority={i === 0}
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      ))}

      {/* Dot indicators */}
      <div
        role="tablist"
        aria-label="Select slide"
        className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2"
      >
        {slides.map((slide, i) => (
          <button
            key={i}
            role="tab"
            type="button"
            aria-selected={i === active}
            aria-label={`Go to slide ${i + 1}: ${slide.alt}`}
            onClick={() => goTo(i)}
            className={[
              "h-2 w-2 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              i === active ? "bg-cf-cta" : "bg-cf-divider hover:bg-cf-charcoal/40",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}
