"use client";

import { useState } from "react";
import { ScrollZoomImage } from "@/components/motion/ScrollZoomImage";

// cf-3qt.6.F.1: multi-image gallery for the PDP. The active main image is
// also controllable from the parent via `activeUrl` (used by the variant
// picker — selecting a variant with its own mainMedia wins over the thumb
// selection so the swatch and main stay consistent).
//
// cf-3qt.7.M.1 (cf-2i7): main image is wrapped in ScrollZoomImage so it
// gets a subtle scroll-linked scale drift. The wrapper clips with
// overflow-hidden; the underlying <img> keeps its testid/alt/src so the
// gallery keyboard and thumb-click tests remain stable.

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
      <ScrollZoomImage
        src={active.url}
        alt={active.alt ?? productName}
        data-testid="pdp-main-image"
        className="aspect-square w-full overflow-hidden rounded-lg"
        imgClassName="h-full w-full object-cover"
      />
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
