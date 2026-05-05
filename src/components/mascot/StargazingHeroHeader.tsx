"use client";

// Header-band variant of StargazingHero. The full-bleed StargazingHero
// uses viewBox 1920x800 with elements (moon at y=190, bear at y=700)
// positioned for a tall hero. When that SVG is xMidYMid-sliced into the
// 213px header band the visible viewBox region is roughly y=240..559,
// which crops the moon, bear, and most fireflies. This component is a
// purpose-built night scene with viewBox 1920x213 — every element sits
// inside the visible band.

import { useMemo } from "react";

const SKY = {
  sky0: "#0E1838",
  sky1: "#1F2A4A",
  sky2: "#3A2548",
  ridge1: "#1A2440",
  ridge2: "#0E1424",
  moon: "#FAF2DE",
  star: "#FAE8B0",
  cream: "#FAF2DE",
  firefly: "#F5E89A",
  bear: "#06091A",
  bearMuzzle: "#A8806A",
};

type StarDef = { x: number; y: number; r: number; tw: number };
type FireflyDef = { cx: number; cy: number; ph: number; sp: number };

function buildStars(): StarDef[] {
  // Sprinkled across the top 90px — sky region above the moon and ridges.
  return Array.from({ length: 32 }, (_, i) => ({
    x: (i * 211) % 1920,
    y: 8 + ((i * 17) % 80),
    r: 0.6 + (i % 4) * 0.3,
    tw: i % 7,
  }));
}

function buildFireflies(): FireflyDef[] {
  // Exactly two — placed off-center so they don't visually compete with
  // the bear (centered) or the moon (top-right).
  return [
    { cx: 380, cy: 120, ph: 0.0, sp: 1.0 },
    { cx: 760, cy: 95, ph: 1.4, sp: 1.3 },
  ];
}

function BearLying({ breath }: { breath: number }) {
  // Centered horizontally, sitting on the lowest ridge. Scale 0.55 keeps
  // the bear silhouette readable inside the 213px band — about 50px tall.
  // `breath` is a subtle scaleY pulse driven by the parent's time tick.
  const c = SKY;
  return (
    <g transform={`translate(960 195) scale(0.55)`}>
      <g transform={`scale(1 ${breath})`} style={{ transformOrigin: "0 0" }}>
        <ellipse cx="0" cy="0" rx="62" ry="14" fill={c.bear} />
        <ellipse cx="44" cy="-8" rx="22" ry="14" fill={c.bear} />
        <circle cx="38" cy="-18" r="6" fill={c.bear} />
        <circle cx="50" cy="-18" r="6" fill={c.bear} />
        <ellipse cx="56" cy="-4" rx="8" ry="5" fill={c.bearMuzzle} />
        <ellipse cx="60" cy="-7" rx="2" ry="1.5" fill="#1A0E08" />
        <circle cx="44" cy="-12" r="1.4" fill={c.cream} />
        <circle cx="52" cy="-12" r="1.4" fill={c.cream} />
        <ellipse cx="-46" cy="2" rx="10" ry="5" fill={c.bear} />
      </g>
    </g>
  );
}

export function StargazingHeroHeader({
  time = 0,
  reduceMotion = false,
}: {
  time?: number;
  reduceMotion?: boolean;
} = {}) {
  const stars = useMemo<StarDef[]>(() => buildStars(), []);
  const fireflies = useMemo<FireflyDef[]>(() => buildFireflies(), []);
  const t = reduceMotion ? 0 : time;
  // ±2% breathing — slow enough not to be vestibular-triggering.
  const breath = 1 + (reduceMotion ? 0 : Math.sin(t * 0.6) * 0.02);

  return (
    <svg
      viewBox="0 0 1920 213"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      style={{ display: "block", width: "100%", height: "100%" }}
      data-slot="stargazing-header-hero"
      aria-label="Bear under a starry Blue Ridge night sky"
    >
      <defs>
        <linearGradient id="sgh-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={SKY.sky0} />
          <stop offset="60%" stopColor={SKY.sky1} />
          <stop offset="100%" stopColor={SKY.sky2} />
        </linearGradient>
        <radialGradient id="sgh-moon-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={SKY.moon} stopOpacity="0.9" />
          <stop offset="100%" stopColor={SKY.moon} stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="1920" height="213" fill="url(#sgh-sky)" />

      {/* Stars — twinkle on opacity. */}
      <g data-slot="stargazing-header-stars">
        {stars.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill={SKY.star}
            opacity={0.55 + 0.4 * Math.sin(t * 1.2 + s.tw)}
          />
        ))}
      </g>

      {/* Moon — top-right, ≥24px diameter visible per acceptance. */}
      <g transform="translate(1700 50)" data-slot="stargazing-header-moon">
        <circle r="60" fill="url(#sgh-moon-glow)" />
        <circle r="24" fill={SKY.moon} />
        <circle cx="-7" cy="-4" r="3.5" fill={SKY.sky2} opacity="0.18" />
        <circle cx="5" cy="6" r="2.4" fill={SKY.sky2} opacity="0.2" />
      </g>

      {/* Ridges — bear sits at the front ridge (y=180). */}
      <path
        d="M 0 145 Q 480 130 960 138 T 1920 148 L 1920 213 L 0 213 Z"
        fill={SKY.ridge1}
      />
      <path
        d="M 0 175 Q 480 165 960 172 T 1920 180 L 1920 213 L 0 213 Z"
        fill={SKY.ridge2}
      />

      <BearLying breath={breath} />

      {/* Fireflies — exactly two per acceptance. */}
      <g data-slot="stargazing-header-fireflies">
        {fireflies.map((f, i) => {
          const fx = f.cx + Math.sin(t * f.sp + f.ph) * 18;
          const fy = f.cy + Math.cos(t * f.sp * 0.8 + f.ph) * 10;
          const a = 0.5 + 0.5 * Math.sin(t * 3 + f.ph);
          return (
            <g key={i} transform={`translate(${fx} ${fy})`}>
              <circle r="6" fill={SKY.firefly} opacity={a * 0.18} />
              <circle r="2" fill={SKY.firefly} opacity={a} />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
