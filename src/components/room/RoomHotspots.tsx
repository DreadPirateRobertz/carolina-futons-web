"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState } from "react";
import { useReducedMotion } from "framer-motion";

// cf-(delight) shop-the-room hotspots: animated dot markers overlaid on a
// lifestyle hero photo. Click/tap a dot → popover with product name +
// price + "View product" link. Hover (desktop) or focus (keyboard) also
// reveals the popover.
//
// Phase-1 scope: the primitive itself + tests + an unwired demo. Lifestyle
// photo selection + Home/PLP integration land in follow-up beads under
// the same epic.
//
// Interaction:
//   - Click / Enter / Space on a dot toggles its popover.
//   - Escape closes the open popover.
//   - Standard ARIA disclosure pattern — Tab focuses the dot (visible
//     focus ring) but doesn't auto-open the popover. The user activates
//     it explicitly.
//   - Hover-to-preview is intentionally NOT wired here — interleaving
//     mouse-hover open/close with click-to-pin produced flaky timings;
//     follow-up bead under the same epic.
//
// A11y:
//   - Each hotspot is a real <button> so keyboard users tab through them.
//   - aria-expanded reflects popover state.
//   - aria-label names the linked product so SR users know what each dot
//     opens before they activate it.
//   - Reduced motion: the pulse animation is dropped, the dot stays
//     static.

export type RoomHotspot = {
  id: string;
  // Position as percentage of the image bounding box, [0..100]. (0,0) is
  // top-left. We use percentages so a single hotspot map works across
  // breakpoints without hand-tuning per viewport.
  xPct: number;
  yPct: number;
  productSlug: string;
  productName: string;
  formattedPrice: string;
};

export type RoomHotspotsProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  hotspots: ReadonlyArray<RoomHotspot>;
  className?: string;
};

export function RoomHotspots({
  src,
  alt,
  width,
  height,
  hotspots,
  className,
}: RoomHotspotsProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const reduce = useReducedMotion() ?? false;

  return (
    <figure
      data-slot="room-hotspots"
      className={
        "relative overflow-hidden rounded-lg " + (className ?? "")
      }
      onKeyDown={(e) => {
        if (e.key === "Escape" && openId) {
          e.stopPropagation();
          setOpenId(null);
        }
      }}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="h-auto w-full select-none"
        priority={false}
      />
      {hotspots.map((spot) => (
        <Hotspot
          key={spot.id}
          spot={spot}
          isOpen={openId === spot.id}
          reduceMotion={reduce}
          onToggle={() =>
            setOpenId((current) => (current === spot.id ? null : spot.id))
          }
        />
      ))}
    </figure>
  );
}

type HotspotProps = {
  spot: RoomHotspot;
  isOpen: boolean;
  reduceMotion: boolean;
  onToggle: () => void;
};

function Hotspot({ spot, isOpen, reduceMotion, onToggle }: HotspotProps) {
  const popoverId = useId();

  return (
    <div
      className="absolute"
      style={{
        left: `${spot.xPct}%`,
        top: `${spot.yPct}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={popoverId}
        aria-label={`Shop ${spot.productName}`}
        onClick={onToggle}
        data-slot="room-hotspot-dot"
        className={
          "relative block h-5 w-5 rounded-full border-2 border-white bg-cf-cta shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2"
        }
      >
        <span
          aria-hidden="true"
          className={
            "absolute inset-0 rounded-full bg-cf-cta/60 " +
            (reduceMotion ? "" : "animate-ping")
          }
        />
        <span className="sr-only">Shop {spot.productName}</span>
      </button>

      {isOpen ? (
        <div
          id={popoverId}
          role="dialog"
          aria-label={spot.productName}
          data-slot="room-hotspot-popover"
          // Anchor the card just below + right of the dot. translate-x-0
          // (rather than recentring) keeps the dot's pulse visible at the
          // popover's left edge.
          className="absolute left-4 top-4 z-10 w-56 rounded-md border border-cf-divider bg-white p-3 shadow-lg"
        >
          <p className="text-sm font-medium text-cf-ink">
            {spot.productName}
          </p>
          <p className="mt-1 text-sm text-cf-cta">{spot.formattedPrice}</p>
          <Link
            href={`/products/${spot.productSlug}`}
            className="mt-2 inline-block text-xs font-medium uppercase tracking-[0.18em] text-cf-cta underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
          >
            View product →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
