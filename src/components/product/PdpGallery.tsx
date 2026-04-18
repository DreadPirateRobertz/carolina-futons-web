"use client";

import { useRef, useState } from "react";
import { m, useReducedMotion, useScroll, useTransform } from "framer-motion";

// cf-3qt.6.F.1: multi-image gallery for the PDP. The active main image is
// also controllable from the parent via `activeUrl` (used by the variant
// picker — selecting a variant with its own mainMedia wins over the thumb
// selection so the swatch and main stay consistent).
//
// The main image gets a subtle scroll-driven zoom (1.00 → 1.05 over its
// viewport pass). Honors prefers-reduced-motion (flat scale of 1).

export type GalleryImage = {
  url: string;
  alt?: string;
};

export type PdpGalleryProps = {
  images: ReadonlyArray<GalleryImage>;
  productName: string;
  activeUrl?: string;
};

export function PdpGallery({ images, productName, activeUrl }: PdpGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div
        data-testid="pdp-gallery-empty"
        className="aspect-square w-full rounded-lg bg-cf-sand"
      />
    );
  }

  const activeIndexFromUrl = activeUrl
    ? images.findIndex((img) => img.url === activeUrl)
    : -1;
  const index =
    activeIndexFromUrl >= 0
      ? activeIndexFromUrl
      : Math.min(selectedIndex, images.length - 1);
  const active = images[index];

  const handleKey = (event: React.KeyboardEvent) => {
    if (images.length <= 1) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % images.length);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  return (
    <div data-slot="pdp-gallery" className="space-y-3">
      <ZoomMainImage src={active.url} alt={active.alt ?? productName} />
      {images.length > 1 ? (
        <div
          role="tablist"
          aria-label={`${productName} image gallery`}
          onKeyDown={handleKey}
          className="flex gap-2 overflow-x-auto"
          tabIndex={0}
        >
          {images.map((img, i) => {
            const selected = i === index;
            return (
              <button
                key={`${img.url}-${i}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-label={`Image ${i + 1} of ${images.length}${img.alt ? `: ${img.alt}` : ""}`}
                onClick={() => setSelectedIndex(i)}
                className={
                  "h-16 w-16 shrink-0 overflow-hidden rounded border transition " +
                  (selected
                    ? "border-cf-espresso ring-1 ring-cf-espresso"
                    : "border-cf-sand hover:border-cf-espresso/40")
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt=""
                  aria-hidden="true"
                  className="h-full w-full object-cover"
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

// Subcomponent so the useScroll hook is only created when the gallery has at
// least one image — the empty-state early return above would otherwise hand
// useScroll an unhydrated ref and trigger a hydration error in tests.
function ZoomMainImage({ src, alt }: { src: string; alt: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });
  // Map scroll progress through the gallery to a tiny scale curve.
  // Range [start end → end start] = element entering bottom of viewport
  // through leaving the top. The 1.05 ceiling is deliberate — anything
  // larger compounds with Lenis's smoothed scroll velocity into perceptible
  // parallax, which is the vestibular trigger WCAG 2.3.3 (Animation from
  // Interactions, AAA) is designed to avoid.
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1.05, 1]);

  return (
    <div ref={containerRef} className="overflow-hidden rounded-lg">
      <m.img
        src={src}
        alt={alt}
        data-testid="pdp-main-image"
        // WCAG 2.3.3: when prefers-reduced-motion is set, omit the scale
        // style entirely (no MotionValue subscription, no transform) — not
        // just scale=1 — so the image is byte-for-byte static.
        style={reduce ? undefined : { scale }}
        className="aspect-square w-full object-cover"
      />
    </div>
  );
}
