"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

// cf-delight: shop-the-room hotspots — animated dot markers overlaid on a
// lifestyle hero photo. Click/tap or Enter/Space activates a dot to reveal
// a popover with the product name + price + a link to the PDP.
//
// Phase-1 scope: the primitive itself + tests + the empty-array fallback.
// Lifestyle photo selection + Home/PLP integration land in follow-up
// beads under the same epic.
//
// Interaction:
//   - Click / Enter / Space on a dot toggles its popover.
//   - Tab focuses the dot (visible focus ring) but doesn't auto-open —
//     standard Disclosure pattern. The user activates explicitly.
//   - Escape closes the open popover and returns focus to the dot.
//   - Only one popover open at a time across all dots in a scene.
//   - Hover-to-preview is intentionally NOT wired; interleaving mouse-
//     hover open/close with click-to-pin needs a separate hover-state
//     model and ships in a follow-up bead.
//
// A11y:
//   - Real <button> per hotspot (tab order, native activation).
//   - aria-expanded reflects popover state; aria-controls + id wires the
//     dot to its popover content for SR navigation.
//   - aria-label = "Shop {productName}" so SR users know what each dot
//     opens before activating.
//   - Reduced motion: pulse animation drops to a static dot via
//     useReducedMotion(). Dot stays visible.

export type RoomHotspot = {
  id: string;
  // Position as percentage of the image bounding box, [0..100]. (0,0) is
  // top-left. Percentages keep a single map valid across breakpoints
  // without per-viewport tuning.
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

// Validate the hotspot prop in dev so CMS-fed maps fail loudly instead
// of silently rendering invisible / mis-aimed dots. Production strips
// this whole block; the early returns also keep the bad spot from
// rendering broken UI to a real visitor.
function isValidHotspot(spot: RoomHotspot, seenIds: Set<string>): boolean {
  if (!spot.id || seenIds.has(spot.id)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[RoomHotspots] dropping hotspot with missing or duplicate id:",
        spot.id,
      );
    }
    return false;
  }
  if (
    !Number.isFinite(spot.xPct) ||
    !Number.isFinite(spot.yPct) ||
    spot.xPct < 0 ||
    spot.xPct > 100 ||
    spot.yPct < 0 ||
    spot.yPct > 100
  ) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[RoomHotspots] dropping hotspot ${spot.id} with out-of-range position (xPct=${spot.xPct}, yPct=${spot.yPct})`,
      );
    }
    return false;
  }
  if (!spot.productSlug || !spot.productName) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[RoomHotspots] dropping hotspot ${spot.id} with missing productSlug or productName`,
      );
    }
    return false;
  }
  seenIds.add(spot.id);
  return true;
}

export function RoomHotspots({
  src,
  alt,
  width,
  height,
  hotspots,
  className,
}: RoomHotspotsProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  // a11y default: when the prefers-reduced-motion media query hasn't
  // resolved yet (SSR + first paint), assume the user wants reduced
  // motion. Better to drop the pulse for a frame than to flash motion
  // at someone who explicitly opted out.
  const reduce = useReducedMotion() ?? true;

  const seen = new Set<string>();
  const valid = hotspots.filter((s) => isValidHotspot(s, seen));

  return (
    <figure
      data-slot="room-hotspots"
      className={cn("relative overflow-hidden rounded-lg", className)}
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
      {valid.map((spot) => (
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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  // Return focus to the dot when its popover closes (Escape from the
  // figure-level keydown handler, or another dot opens). Only refocus on
  // the open→closed transition, not on every render where isOpen=false.
  useEffect(() => {
    if (wasOpen.current && !isOpen) {
      buttonRef.current?.focus();
    }
    wasOpen.current = isOpen;
  }, [isOpen]);

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
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={popoverId}
        aria-label={`Shop ${spot.productName}`}
        onClick={onToggle}
        data-slot="room-hotspot-dot"
        className="relative block h-5 w-5 rounded-full border-2 border-white bg-cf-cta shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2"
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-0 rounded-full bg-cf-cta/60",
            !reduceMotion && "animate-ping",
          )}
        />
      </button>

      {isOpen ? (
        <div
          id={popoverId}
          aria-label={spot.productName}
          data-slot="room-hotspot-popover"
          // Anchor the card just below + right of the dot. Phase-1
          // hardcoded position; future revision should clamp near the
          // image edges to keep the card in-bounds on tight crops.
          className="absolute left-4 top-4 z-10 w-56 rounded-md border border-cf-divider bg-white p-3 shadow-lg dark:bg-cf-cream"
        >
          <p className="text-sm font-medium text-cf-ink">
            {spot.productName}
          </p>
          <p className="mt-1 text-sm text-cf-cta">{spot.formattedPrice}</p>
          <Link
            href={`/products/${encodeURIComponent(spot.productSlug)}`}
            className="mt-2 inline-block text-xs font-medium uppercase tracking-[0.18em] text-cf-cta underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
          >
            View product →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
