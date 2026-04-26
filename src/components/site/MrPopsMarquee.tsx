// cf-delight D2 — Mr Pops image marquee.
// Three stacked rows of beauty-shot images that auto-scroll at different speeds.
// Pause-on-hover and focus-within via CSS .marquee-section selector in globals.css.
// Reduced-motion: globals.css @media query kills animation-duration globally,
// so no per-component guard is needed.

import type React from "react";

const CDN = "https://static.wixstatic.com/media";
const CROP = "/v1/fill/w_640,h_800,al_c,q_85/file.jpg";

export type Shot = { id: string; alt: string; label: string };

export const BEAUTY_SHOTS: readonly Shot[] = [
  {
    id: "e04e89_72d82110638045c39e0f6274363c15f8~mv2.jpg",
    alt: "Monterey mission-style hardwood futon in a sunlit living room",
    label: "Futon Frames",
  },
  {
    id: "e04e89_818d75df410a41e1a0721207333bc93d~mv2.jpg",
    alt: "Murphy cabinet bed open in a home office, transforming the space",
    label: "Murphy Beds",
  },
  {
    id: "e04e89_b9d4cf76a1a84bf5bb4821edc53f6df2~mv2.jpg",
    alt: "Natural hardwood platform bed in a coastal bedroom",
    label: "Platform Beds",
  },
  {
    id: "e04e89_55ecd0dfe1d5498b8a3f8cb583d5089b~mv2.jpg",
    alt: "Futon mattress shown in natural cotton",
    label: "Mattresses",
  },
  {
    id: "e04e89_4bea49a709a3470a8315b5acd7309b0f~mv2.jpg",
    alt: "Hardwood futon frame in natural finish on showroom floor",
    label: "Futon Frames",
  },
  {
    id: "e04e89_8cd0de059f244e8485a600d4783caa92~mv2.jpg",
    alt: "Low-profile solid wood platform bed in light oak",
    label: "Platform Beds",
  },
  {
    id: "e04e89_9a21133f83c3412ebe88d2f232c56cf9~mv2.jpg",
    alt: "Clearance mattresses on sale in showroom",
    label: "On Sale",
  },
];

// Three rows at distinct speeds (42 / 58 / 48 s) so rows never animate in lock-step.
const ROWS: readonly { indices: readonly number[]; durationMs: number }[] = [
  { indices: [0, 1, 2, 3, 4], durationMs: 42000 },   // marquee_0
  { indices: [2, 5, 0, 6, 3], durationMs: 58000 },   // marquee_1
  { indices: [4, 1, 6, 5, 2], durationMs: 48000 },   // marquee_2
] as const;

function MarqueeTrack({ shots, durationMs }: { shots: Shot[]; durationMs: number }): React.ReactElement {
  // Duplicate so translateX(-50%) loops seamlessly.
  // mr-3 per-item (not gap-3 on the container): gap-3 would leave a half-gap
  // discontinuity because translateX(-50%) shifts by N items + (N-0.5) gaps.
  const doubled = [...shots, ...shots];
  return (
    <ul
      className="marquee-track flex will-change-transform"
      style={{ animation: `marquee-scroll ${durationMs}ms linear infinite` }}
      aria-hidden="true"
    >
      {doubled.map((shot, i) => (
        <li key={i} className="mr-3 w-[200px] shrink-0 sm:w-[240px]">
          <div className="relative aspect-[4/5] overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${CDN}/${shot.id}${CROP}`}
              alt={shot.alt}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <span className="absolute bottom-2 left-2 rounded-full bg-cf-navy/70 px-2.5 py-0.5 text-[11px] font-semibold text-cf-cream backdrop-blur-sm">
              {shot.label}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function MrPopsMarquee(): React.ReactElement {
  return (
    <section
      aria-label="Furniture gallery"
      data-testid="mr-pops-marquee"
      className="marquee-section overflow-hidden bg-cf-cream py-8 sm:py-10"
    >
      <div className="space-y-3">
        {ROWS.map((row, i) => (
          <MarqueeTrack
            key={i}
            shots={row.indices.map((idx) => BEAUTY_SHOTS[idx]!)}
            durationMs={row.durationMs}
          />
        ))}
      </div>
    </section>
  );
}
