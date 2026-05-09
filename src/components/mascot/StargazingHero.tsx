"use client";

// Night hero: bear lying on a Blue Ridge hill, milky way, stars, fireflies, moon.
// Ported from design-harvest/v3-heroes.jsx HeroStargaze + v3-02-stargazing.svg.

import { useMemo } from "react";

const SKY = {
  sky0: "#0E1838",
  sky1: "#1F2A4A",
  sky2: "#3A2548",
  r1: "#06091A",
  r2: "#0E1424",
  r3: "#1A2440",
  r4: "#2A3658",
  r5: "#3F4A78",
  moon: "#FAF2DE",
  star: "#FAE8B0",
  mw: "#8FA8E0",
  firefly: "#F5E89A",
  pine: "#06091A",
  bear: "#06091A",
  bearMuzzle: "#A8806A",
  cream: "#FAF2DE",
};

type StarDef = { x: number; y: number; r: number; tw: number };
type FireflyDef = { cx: number; cy: number; ph: number; sp: number };

function buildStars(): StarDef[] {
  return Array.from({ length: 80 }, (_, i) => ({
    x: (i * 71) % 1920,
    y: (i * 41) % 380,
    r: 0.6 + (i % 5) * 0.4,
    tw: i % 7,
  }));
}

function buildFireflies(): FireflyDef[] {
  return Array.from({ length: 14 }, (_, i) => ({
    cx: 200 + (i * 121) % 1500,
    cy: 500 + (i * 47) % 200,
    ph: i * 0.7,
    sp: 0.8 + (i % 3) * 0.4,
  }));
}

// Compact mode uses a 1920×240 band sized for the site header (~197px tall).
// preserveAspectRatio="xMidYMid slice" means height drives scale at narrow
// viewports, so the viewBox is cropped horizontally around x=960. The
// always-visible band at min mobile (375px wide × ~197px header) is
// x ∈ [749, 1171] — anything outside is cropped on phones. Moon, bear, and
// fireflies must stay inside that window.
const COMPACT_FIREFLIES: FireflyDef[] = [
  { cx: 820, cy: 175, ph: 0.0, sp: 1.0 },
  { cx: 1080, cy: 165, ph: 1.6, sp: 1.2 },
];

function buildCompactStars(): StarDef[] {
  return Array.from({ length: 32 }, (_, i) => ({
    x: (i * 71) % 1920,
    y: 8 + ((i * 23) % 140),
    r: 0.6 + (i % 5) * 0.3,
    tw: i % 7,
  }));
}

function CompactBear({ t = 0 }: { t?: number }) {
  const c = SKY;
  // Subtle breathing — chest rises ~3% over a slow cycle so the bear feels
  // alive without animating to motion-sickness levels.
  const breath = 1 + 0.03 * Math.sin(t * 0.7);
  const lookUp = -0.15 * Math.sin(t * 0.5);
  return (
    <g transform={`translate(960 ${210 + lookUp}) scale(1.3 ${1.3 * breath})`}>
      {/* Body */}
      <ellipse cx="0" cy="0" rx="58" ry="13" fill={c.bear} />
      {/* Head */}
      <ellipse cx="42" cy="-7" rx="20" ry="13" fill={c.bear} />
      {/* Ears */}
      <circle cx="36" cy="-16" r="5.5" fill={c.bear} />
      <circle cx="48" cy="-16" r="5.5" fill={c.bear} />
      {/* Muzzle */}
      <ellipse cx="54" cy="-3" rx="7" ry="4" fill={c.bearMuzzle} />
      {/* Nose */}
      <ellipse cx="58" cy="-6" rx="1.6" ry="1.2" fill="#1A0E08" />
      {/* Eyes */}
      <circle cx="42" cy="-11" r="1.2" fill={c.cream} />
      <circle cx="50" cy="-11" r="1.2" fill={c.cream} />
      {/* Belly highlight */}
      <ellipse cx="-8" cy="-2" rx="28" ry="9" fill="#4A2818" opacity="0.6" />
      {/* Paw */}
      <ellipse cx="-42" cy="2" rx="9" ry="4.5" fill={c.bear} />
    </g>
  );
}

function PineSilhouette({ x, scale = 1 }: { x: number; scale?: number }) {
  return (
    <g transform={`translate(${x} 0) scale(${scale})`} fill={SKY.pine}>
      <rect x="-2" y="0" width="4" height="10" />
      <polygon points="0,-50 -16,-26 16,-26" />
      <polygon points="0,-32 -18,-8 18,-8" />
      <polygon points="0,-14 -20,8 20,8" />
    </g>
  );
}

function BearLying({ py }: { py: number }) {
  const c = SKY;
  return (
    <g transform={`translate(960 ${py}) scale(2.6)`}>
      {/* Body */}
      <ellipse cx="0" cy="0" rx="62" ry="14" fill={c.bear} />
      {/* Head */}
      <ellipse cx="44" cy="-8" rx="22" ry="14" fill={c.bear} />
      {/* Ears */}
      <circle cx="38" cy="-18" r="6" fill={c.bear} />
      <circle cx="50" cy="-18" r="6" fill={c.bear} />
      {/* Muzzle */}
      <ellipse cx="56" cy="-4" rx="8" ry="5" fill={c.bearMuzzle} />
      <ellipse cx="60" cy="-7" rx="2" ry="1.5" fill="#1A0E08" />
      {/* Eyes — looking up */}
      <circle cx="44" cy="-12" r="1.4" fill={c.cream} />
      <circle cx="52" cy="-12" r="1.4" fill={c.cream} />
      {/* Belly */}
      <ellipse cx="-10" cy="-2" rx="32" ry="10" fill="#4A2818" opacity="0.6" />
      {/* Paws relaxed */}
      <ellipse cx="-46" cy="2" rx="10" ry="5" fill={c.bear} />
    </g>
  );
}

// Time animation is hoisted to LivingHero (single RAF for the page) — pass
// `time` (seconds since page mount) and `reduceMotion` from the parent.
// Defaults preserve standalone usage (e.g. /theme-c) where the component
// drives nothing animated and renders a frozen scene at t=0.
export function StargazingHero({
  time = 0,
  reduceMotion = false,
  compact = false,
}: {
  time?: number;
  reduceMotion?: boolean;
  /**
   * Compact layout sized for the ~197px site header. Switches to a 1920×240
   * viewBox with hand-placed moon, bear, and exactly 2 fireflies that stay
   * inside the visible slice at common header heights.
   */
  compact?: boolean;
} = {}) {
  // useMemo lazily seeds these once per mount and is safe during render
  // (useRef writes during render trip react-hooks/no-ref-in-render).
  const stars = useMemo<StarDef[]>(
    () => (compact ? buildCompactStars() : buildStars()),
    [compact],
  );
  const fireflies = useMemo<FireflyDef[]>(
    () => (compact ? COMPACT_FIREFLIES : buildFireflies()),
    [compact],
  );

  // When reduce-motion is on, freeze t at 0 — fireflies sit at their static
  // positions, shooting star is hidden, sky is still painted in full color.
  const t = reduceMotion ? 0 : time;
  const shootX = 400 + (t % 8) * 200;
  const shootY = 120 + (t % 8) * 50;
  const shootOpacity = reduceMotion ? 0 : t % 8 < 0.8 ? 1 - (t % 8) / 0.8 : 0;

  if (compact) {
    return (
      <svg
        viewBox="0 0 1920 240"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        style={{ display: "block", width: "100%", height: "100%" }}
        aria-label="Bear stargazing on a Blue Ridge hillside under a starry night sky with fireflies"
      >
        <defs>
          <linearGradient id="sg-sky-c" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SKY.sky0} />
            <stop offset="60%" stopColor={SKY.sky1} />
            <stop offset="100%" stopColor={SKY.sky2} />
          </linearGradient>
          <radialGradient id="sg-moon-c" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={SKY.moon} stopOpacity="1" />
            <stop offset="100%" stopColor={SKY.moon} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="sg-mw-c" cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor={SKY.mw} stopOpacity="0.32" />
            <stop offset="60%" stopColor={SKY.mw} stopOpacity="0.07" />
            <stop offset="100%" stopColor={SKY.mw} stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="1920" height="240" fill="url(#sg-sky-c)" />

        {/* Milky way wash across mid-band */}
        <ellipse
          cx="960"
          cy="100"
          rx="1200"
          ry="60"
          fill="url(#sg-mw-c)"
          transform="rotate(-8 960 100)"
        />

        {/* Stars */}
        <g data-slot="stargazing-stars-compact">
          {stars.map((s, i) => (
            <circle
              key={i}
              cx={s.x}
              cy={s.y}
              r={s.r}
              fill={SKY.star}
              opacity={0.6 + 0.4 * Math.sin(t * 1.2 + s.tw)}
            />
          ))}
          {/* Prominent stars with glow — kept inside the mobile-visible band */}
          <circle cx="820" cy="48" r="1.8" fill={SKY.cream} />
          <circle cx="820" cy="48" r="6" fill={SKY.cream} opacity="0.25" />
          <circle cx="980" cy="30" r="2.0" fill={SKY.cream} />
          <circle cx="980" cy="30" r="7" fill={SKY.cream} opacity="0.25" />
        </g>

        {/* Moon — placed inside the mobile-visible band [749, 1171] so it is
            never cropped at narrow viewports. */}
        <g data-slot="stargazing-moon" transform="translate(1100 70)">
          <circle r="120" fill="url(#sg-moon-c)" />
          <circle r="42" fill={SKY.moon} />
          <circle cx="-14" cy="-8" r="6" fill={SKY.sky2} opacity="0.18" />
          <circle cx="9" cy="11" r="4" fill={SKY.sky2} opacity="0.2" />
          <circle cx="14" cy="-14" r="3" fill={SKY.sky2} opacity="0.18" />
        </g>

        {/* Distant ridges */}
        <path d="M 0 175 Q 480 158 960 168 T 1920 174 L 1920 240 L 0 240 Z" fill={SKY.r4} />
        <path d="M 0 200 Q 480 185 960 195 T 1920 200 L 1920 240 L 0 240 Z" fill={SKY.r3} />
        <path d="M 0 220 Q 480 210 960 215 T 1920 220 L 1920 240 L 0 240 Z" fill={SKY.r2} />

        {/* Pine silhouettes flanking the bear */}
        <g transform="translate(0 200)">
          <PineSilhouette x={120} scale={0.9} />
          <PineSilhouette x={1800} scale={0.9} />
        </g>

        {/* Bear stargazing on hill */}
        <g data-slot="stargazing-bear">
          <CompactBear t={t} />
        </g>

        {/* Exactly 2 fireflies hovering near the bear */}
        <g data-slot="stargazing-fireflies-compact">
          {fireflies.map((f, i) => {
            const fx = f.cx + Math.sin(t * f.sp + f.ph) * 18;
            const fy = f.cy + Math.cos(t * f.sp * 0.8 + f.ph) * 10;
            const a = 0.5 + 0.5 * Math.sin(t * 3 + f.ph);
            return (
              <g key={i} transform={`translate(${fx} ${fy})`} data-slot="firefly">
                <circle r="6" fill={SKY.firefly} opacity={a * 0.18} />
                <circle r="2.0" fill={SKY.firefly} opacity={a} />
              </g>
            );
          })}
        </g>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 1920 800"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      style={{ display: "block", width: "100%", height: "100%" }}
      aria-label="Bear lying on a Blue Ridge hill under a starry night sky with fireflies"
    >
      <defs>
        <linearGradient id="sg-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={SKY.sky0} />
          <stop offset="60%" stopColor={SKY.sky1} />
          <stop offset="100%" stopColor={SKY.sky2} />
        </linearGradient>
        <radialGradient id="sg-mw" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor={SKY.mw} stopOpacity="0.35" />
          <stop offset="60%" stopColor={SKY.mw} stopOpacity="0.08" />
          <stop offset="100%" stopColor={SKY.mw} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sg-moon" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={SKY.moon} stopOpacity="1" />
          <stop offset="100%" stopColor={SKY.moon} stopOpacity="0" />
        </radialGradient>
        <filter id="sg-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves={3} seed={7} />
          <feColorMatrix values="0 0 0 0 0.18  0 0 0 0 0.10  0 0 0 0 0.06  0 0 0 0.22 0" />
        </filter>
      </defs>

      <rect width="1920" height="800" fill="url(#sg-sky)" />

      {/* Milky way */}
      <ellipse
        cx="960"
        cy="280"
        rx="1400"
        ry="180"
        fill="url(#sg-mw)"
        transform="rotate(-12 960 280)"
      />

      {/* Stars */}
      <g>
        {stars.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill={SKY.star}
            opacity={0.6 + 0.4 * Math.sin(t * 1.2 + s.tw)}
          />
        ))}
        {/* Prominent stars with glow */}
        <circle cx="320" cy="160" r="1.8" fill={SKY.cream} />
        <circle cx="320" cy="160" r="6" fill={SKY.cream} opacity="0.25" />
        <circle cx="1180" cy="100" r="2.2" fill={SKY.cream} />
        <circle cx="1180" cy="100" r="8" fill={SKY.cream} opacity="0.25" />
        <circle cx="1620" cy="220" r="1.6" fill={SKY.cream} />
        <circle cx="1620" cy="220" r="5" fill={SKY.cream} opacity="0.25" />
      </g>

      {/* Moon */}
      <g transform="translate(1500 190)">
        <circle r="220" fill="url(#sg-moon)" />
        <circle r="68" fill={SKY.moon} />
        <circle cx="-22" cy="-12" r="10" fill={SKY.sky2} opacity="0.18" />
        <circle cx="14" cy="18" r="7" fill={SKY.sky2} opacity="0.2" />
        <circle cx="22" cy="-22" r="5" fill={SKY.sky2} opacity="0.18" />
      </g>

      {/* Shooting star */}
      {shootOpacity > 0 && (
        <g opacity={shootOpacity}>
          <line
            x1={shootX}
            y1={shootY}
            x2={shootX - 100}
            y2={shootY - 30}
            stroke={SKY.cream}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx={shootX} cy={shootY} r="2" fill={SKY.cream} />
        </g>
      )}

      {/* Ridges */}
      <path
        d="M 0 440 Q 480 410 960 420 T 1920 435 L 1920 800 L 0 800 Z"
        fill={SKY.r5}
      />
      <path
        d="M 0 510 Q 480 475 960 485 T 1920 505 L 1920 800 L 0 800 Z"
        fill={SKY.r4}
      />
      <path
        d="M 0 580 Q 480 540 960 555 T 1920 575 L 1920 800 L 0 800 Z"
        fill={SKY.r3}
      />
      <path
        d="M 0 650 Q 480 610 960 625 T 1920 645 L 1920 800 L 0 800 Z"
        fill={SKY.r2}
      />

      {/* Pine silhouettes */}
      <g transform="translate(0 600)">
        <PineSilhouette x={80} scale={1.2} />
        <PineSilhouette x={180} scale={1.6} />
        <PineSilhouette x={1700} scale={1.2} />
        <PineSilhouette x={1820} scale={1.6} />
      </g>

      {/* Bear lying on hill */}
      <BearLying py={700} />

      {/* Fireflies */}
      {fireflies.map((f, i) => {
        const fx = f.cx + Math.sin(t * f.sp + f.ph) * 22;
        const fy = f.cy + Math.cos(t * f.sp * 0.8 + f.ph) * 14;
        const a = 0.5 + 0.5 * Math.sin(t * 3 + f.ph);
        return (
          <g key={i} transform={`translate(${fx} ${fy})`}>
            <circle r="8" fill={SKY.firefly} opacity={a * 0.18} />
            <circle r="2.2" fill={SKY.firefly} opacity={a} />
          </g>
        );
      })}

      {/* Film grain */}
      <rect
        width="1920"
        height="800"
        filter="url(#sg-grain)"
        opacity="0.45"
        style={{ mixBlendMode: "multiply" }}
      />
    </svg>
  );
}
