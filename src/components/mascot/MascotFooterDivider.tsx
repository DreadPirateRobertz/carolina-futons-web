"use client";

// cf-c8dc: night-scene divider that visually merges INTO the dark footer.
// Bottom of the sky gradient lands on cf-footer-bg (#1E2A3A) so the
// divider→footer boundary disappears — one coherent surface.
// Alive: sleeping bear breathes, stars twinkle, fireflies drift, all
// gated by useReducedMotion.

import { motion, useReducedMotion } from "framer-motion";
import { V3_NIGHT as n } from "./MascotPalette";

// Mirrors --cf-footer-bg in globals.css; if that token moves, this must too.
const FOOTER_BG = "#1E2A3A";

const STARS = [
  { x: 80, y: 30, r: 1.4, base: 0.7 },
  { x: 220, y: 18, r: 1, base: 0.5 },
  { x: 360, y: 52, r: 1.6, base: 0.85 },
  { x: 540, y: 26, r: 1.1, base: 0.6 },
  { x: 720, y: 38, r: 1.3, base: 0.7 },
  { x: 880, y: 14, r: 1.5, base: 0.85 },
  { x: 1060, y: 44, r: 1, base: 0.5 },
  { x: 1240, y: 22, r: 1.4, base: 0.7 },
  { x: 1380, y: 38, r: 1.1, base: 0.55 },
  { x: 1780, y: 84, r: 1.2, base: 0.6 },
] as const;

const FIREFLIES = [
  { x: 740, y: 152 },
  { x: 1180, y: 158 },
] as const;

export function MascotFooterDivider({ className }: { className?: string }) {
  const reduce = useReducedMotion() ?? false;

  return (
    <svg
      data-slot="mascot-footer-divider"
      viewBox="0 0 1920 200"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      style={{ display: "block", width: "100%", height: "100%" }}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="v3fd-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={n.sky0} />
          <stop offset="55%" stopColor={n.sky1} />
          <stop offset="100%" stopColor={FOOTER_BG} />
        </linearGradient>
        <radialGradient id="v3fd-moonglow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={n.moon} stopOpacity="0.35" />
          <stop offset="100%" stopColor={n.moon} stopOpacity="0" />
        </radialGradient>
        <filter id="v3fd-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves={3} seed={2} />
          <feColorMatrix values="0 0 0 0 0.06  0 0 0 0 0.08  0 0 0 0 0.14  0 0 0 0.10 0" />
        </filter>
      </defs>

      <rect width="1920" height="200" fill="url(#v3fd-sky)" />

      {/* Moon + soft halo */}
      <circle cx="1620" cy="50" r="80" fill="url(#v3fd-moonglow)" />
      <circle cx="1620" cy="50" r="22" fill={n.moon} opacity="0.92" />

      {/* Twinkling stars */}
      <g data-slot="footer-stars">
        {STARS.map((s, i) => (
          <motion.circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill={n.star}
            initial={{ opacity: s.base }}
            animate={
              reduce
                ? { opacity: s.base }
                : { opacity: [s.base, 1, s.base * 0.55, s.base] }
            }
            transition={{
              duration: 3 + (i % 3),
              repeat: reduce ? 0 : Infinity,
              ease: "easeInOut",
              delay: i * 0.4,
            }}
          />
        ))}
      </g>

      {/* Distant ridge (deepest blue) */}
      <path
        d="M 0 100 Q 240 80 480 90 Q 720 100 960 75 Q 1200 50 1440 95 Q 1680 140 1920 105 L 1920 200 L 0 200 Z"
        fill={n.r4}
      />
      {/* Mid ridge */}
      <path
        d="M 0 130 Q 200 110 400 120 Q 600 130 800 110 Q 1040 85 1240 125 Q 1480 165 1680 135 L 1920 130 L 1920 200 L 0 200 Z"
        fill={n.r3}
      />
      {/* Pine treeline silhouette */}
      <g fill={n.r2}>
        {Array.from({ length: 40 }).map((_, i) => {
          const x = i * 50 + (i % 2) * 8;
          const y = 120 + Math.sin(i * 1.3) * 4;
          const h = 10 + (i % 3) * 3;
          return (
            <polygon
              key={i}
              points={`${x},${y - h} ${x - h * 0.32},${y} ${x + h * 0.32},${y}`}
            />
          );
        })}
      </g>
      {/* Foreground ridge — bear nests here */}
      <path
        d="M 0 160 Q 240 150 480 156 Q 720 162 960 150 Q 1200 138 1440 155 Q 1680 175 1920 158 L 1920 200 L 0 200 Z"
        fill={n.r2}
      />

      {/* Sleeping bear — chest breathes */}
      <motion.g
        data-slot="footer-bear"
        transform="translate(960 145)"
        style={{ transformOrigin: "0px 20px", transformBox: "fill-box" }}
        animate={reduce ? undefined : { scaleY: [1, 1.045, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <SleepingBear />
      </motion.g>

      {/* Fireflies — drifting orbs of light */}
      <g data-slot="footer-fireflies">
        {FIREFLIES.map((f, i) => (
          <motion.circle
            key={i}
            r="2.4"
            fill={n.star}
            initial={{ cx: f.x, cy: f.y, opacity: 0.4 }}
            animate={
              reduce
                ? { cx: f.x, cy: f.y, opacity: 0.7 }
                : {
                    cx: [f.x, f.x + 30, f.x - 18, f.x + 8, f.x],
                    cy: [f.y, f.y - 14, f.y + 6, f.y - 8, f.y],
                    opacity: [0.3, 1, 0.4, 0.95, 0.3],
                  }
            }
            transition={{
              duration: 7 + i * 2,
              repeat: reduce ? 0 : Infinity,
              ease: "easeInOut",
            }}
            style={{ filter: `drop-shadow(0 0 5px ${n.star})` }}
          />
        ))}
      </g>

      {/* Grain overlay — keep texture on top */}
      <rect
        width="1920"
        height="200"
        filter="url(#v3fd-grain)"
        opacity="0.28"
        style={{ mixBlendMode: "multiply" }}
      />
    </svg>
  );
}

function SleepingBear() {
  return (
    <g transform="scale(0.7 0.7)">
      <ellipse cx="0" cy="20" rx="58" ry="22" fill={n.fur} />
      <ellipse cx="-50" cy="6" rx="22" ry="18" fill={n.fur} />
      <circle cx="-66" cy="-8" r="7" fill={n.fur} />
      <ellipse cx="-50" cy="14" rx="10" ry="6" fill={n.muzzle} />
      <ellipse cx="-58" cy="10" rx="3" ry="2" fill={n.nose} />
      <path d="M -56 0 q 4 0 6 -1" fill="none" stroke={n.nose} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M -42 -2 q 4 0 6 -1" fill="none" stroke={n.nose} strokeWidth="1.5" strokeLinecap="round" />
      <text x="20" y="-20" fontFamily="Playfair Display, serif" fontSize="14" fontWeight="700" fill={n.muzzle} opacity="0.7">z</text>
      <text x="32" y="-30" fontFamily="Playfair Display, serif" fontSize="18" fontWeight="700" fill={n.muzzle} opacity="0.6">z</text>
      <text x="48" y="-44" fontFamily="Playfair Display, serif" fontSize="22" fontWeight="700" fill={n.muzzle} opacity="0.5">Z</text>
    </g>
  );
}
