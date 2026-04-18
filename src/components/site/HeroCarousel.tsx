"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export type HeroSlide = {
  src: string;
  alt: string;
};

// Reads prefers-reduced-motion and updates on media-query change.
// SSR note: the lazy initializer returns false on the server (window absent),
// so every SSR render produces non-reduced state. The client corrects on
// first hydration — devices with reduced-motion may briefly see animated
// state before hydration. The useEffect guard below prevents a window ReferenceError
// if the effect is ever invoked outside a browser context.
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
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
  if (slides.length === 0) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[HeroCarousel] received empty slides array — rendering nothing");
    }
    return null;
  }

  return <HeroCarouselInner slides={slides} />;
}

function HeroCarouselInner({ slides }: { slides: ReadonlyArray<HeroSlide> }) {
  const [active, setActive] = useState(0);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [focusPaused, setFocusPaused] = useState(false);
  const [manualPaused, setManualPaused] = useState(false);
  const reducedMotion = useReducedMotion();

  const paused = hoverPaused || focusPaused || manualPaused;
  const autoplay = !reducedMotion && !paused && slides.length > 1;

  // Advance the slide every DWELL_MS ms while autoplay is active.
  // NOTE: pass a stable slides array (module constant or useMemo) — an inline
  // array literal would change reference every parent render, re-triggering
  // this effect and restarting the interval on every render cycle.
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

  function onFocusIn() {
    setFocusPaused(true);
  }

  // Resume only when focus leaves the carousel entirely.
  // relatedTarget is the element receiving focus next; if it is still inside
  // this container the blur is an intra-region tab, and we must keep the pause.
  // iOS Safari / older Android Chrome always set relatedTarget = null on blur,
  // so the `contains(null)` check returns false and focus-pause is best-effort
  // on those platforms — autoplay resumes on any blur.
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
      data-autoplay={String(autoplay)}
      tabIndex={0}
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
      onFocus={onFocusIn}
      onBlur={onBlurOut}
      onKeyDown={onKeyDown}
      className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-cf-divider bg-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Slide images — stacked, crossfade via opacity transition.
          Reduced-motion: omit duration-700 so Tailwind's 150ms default applies
          instead of 700ms — effectively instant for the user. */}
      {slides.map((slide, i) => (
        <div
          key={`${slide.src}-${i}`}
          aria-roledescription="slide"
          aria-label={`Slide ${i + 1} of ${slides.length}`}
          aria-hidden={i !== active}
          className={[
            "absolute inset-0 transition-opacity",
            ...(reducedMotion ? [] : ["duration-700"]),
            i === active ? "opacity-100" : "opacity-0",
          ].join(" ")}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            priority={i === 0}
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
            onError={() =>
              console.warn(`[HeroCarousel] failed to load slide image: ${slide.src}`)
            }
          />
        </div>
      ))}

      {/* WCAG 2.2.2: always-visible pause/play control for auto-advancing content. */}
      {slides.length > 1 && !reducedMotion && (
        <button
          type="button"
          aria-label={manualPaused ? "Play slideshow" : "Pause slideshow"}
          onClick={() => setManualPaused((prev) => !prev)}
          className="absolute bottom-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >
          {manualPaused ? (
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
              <path d="M3 2.5l10 5.5-10 5.5V2.5z" />
            </svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
              <path d="M5 3h2v10H5V3zm4 0h2v10H9V3z" />
            </svg>
          )}
        </button>
      )}

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
