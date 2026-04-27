"use client";

// Night hero: bear lying on a Blue Ridge hill, milky way, stars, fireflies, moon.
// Ported from design-harvest/v3-heroes.jsx HeroStargaze + v3-02-stargazing.svg.

import { useEffect, useRef, useState } from "react";

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

export function StargazingHero() {
  const [t, setT] = useState(0);
  const stars = useRef<StarDef[] | null>(null);
  const fireflies = useRef<FireflyDef[] | null>(null);
  if (!stars.current) stars.current = buildStars();
  if (!fireflies.current) fireflies.current = buildFireflies();

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      setT((now - start) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const shootX = 400 + (t % 8) * 200;
  const shootY = 120 + (t % 8) * 50;
  const shootOpacity = t % 8 < 0.8 ? 1 - (t % 8) / 0.8 : 0;

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
        {stars.current.map((s, i) => (
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
      {fireflies.current.map((f, i) => {
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
