"use client";

// cf-c8dc: night-scene divider that visually merges INTO the dark footer.
// Bottom of the sky gradient lands on cf-footer-bg (#1E2A3A) so the
// divider→footer boundary disappears — one coherent surface.
// Alive: sleeping bear breathes, stars twinkle, fireflies drift, all
// gated by useReducedMotion.
//
// cf-f6g: viewBox 1920×200 + xMidYMid slice means at a 375px viewport the
// visible viewBox x-range is centred at 960 with width = viewport_width
// (slice scale = 1.0 when container height = viewBox height). So
// storytelling elements (bear, moon, fireflies) must live inside
// [(1920 - 375)/2, (1920 + 375)/2] = [772.5, 1147.5] to survive the
// horizontal slice down to mobile. Bear at x=960, moon at x=1100,
// fireflies at x=820/1080 all stay inside that window. Stars are
// decorative — half live in the centre window, half spread wider so the
// scene reads richer at desktop without going empty on mobile.

import { motion, useReducedMotion } from "framer-motion";
import { V3_NIGHT as n } from "./MascotPalette";

// Mirrors --cf-footer-bg in globals.css; if that token moves, this must too.
const FOOTER_BG = "#1E2A3A";

const STARS = [
  { x: 220, y: 30, r: 1.4, base: 0.7 },
  { x: 540, y: 18, r: 1, base: 0.5 },
  { x: 800, y: 52, r: 1.6, base: 0.85 },
  { x: 850, y: 26, r: 1.1, base: 0.6 },
  { x: 920, y: 38, r: 1.3, base: 0.7 },
  { x: 980, y: 14, r: 1.5, base: 0.85 },
  { x: 1060, y: 44, r: 1, base: 0.5 },
  { x: 1130, y: 22, r: 1.4, base: 0.7 },
  { x: 1380, y: 38, r: 1.1, base: 0.55 },
  { x: 1780, y: 84, r: 1.2, base: 0.6 },
] as const;

const FIREFLIES = [
  { x: 820, y: 152 },
  { x: 1080, y: 158 },
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

      {/* Moon + soft halo. cx=1100 sits inside the 375px-visible centre
          column [772.5, 1147.5] (cf-f6g); the r=80 halo soft-clips at
          mobile but its gradient fades to opacity 0 so the slice is
          imperceptible. */}
      <circle data-slot="footer-moon-halo" cx="1100" cy="50" r="80" fill="url(#v3fd-moonglow)" />
      <circle data-slot="footer-moon" cx="1100" cy="50" r="22" fill={n.moon} opacity="0.92" />

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
              duration: 1.5 + (i % 3) * 0.6,
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

      {/* Watchful bear — sitting upright on the ridge, breathing, occasional wave.
          Distinct from the header's lying stargazing bear. */}
      <motion.g
        data-slot="footer-bear"
        transform="translate(960 110)"
        style={{ transformOrigin: "0px 50px", transformBox: "fill-box" }}
        animate={reduce ? undefined : { scaleY: [1, 1.06, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <WatchfulBear reduce={reduce} />
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
                    cx: [f.x, f.x + 48, f.x - 28, f.x + 14, f.x],
                    cy: [f.y, f.y - 18, f.y + 8, f.y - 10, f.y],
                    opacity: [0.3, 1, 0.4, 0.95, 0.3],
                  }
            }
            transition={{
              duration: 5 + i * 1.5,
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

function WatchfulBear({ reduce }: { reduce: boolean }) {
  // Sitting upright, eyes catching moonlight, one paw raised in a slow wave.
  // Drawn larger than the lying-bear pose used in the header's StargazingHero
  // so the mood (alert, watchful) reads at a glance.
  return (
    <g transform="scale(0.62 0.62)">
      {/* ground shadow */}
      <ellipse cx="0" cy="50" rx="42" ry="4.5" fill={n.r1} opacity="0.45" />
      {/* legs / haunches */}
      <ellipse cx="-22" cy="44" rx="13" ry="9" fill={n.fur} />
      <ellipse cx="22" cy="44" rx="13" ry="9" fill={n.fur} />
      {/* body */}
      <ellipse cx="0" cy="18" rx="30" ry="28" fill={n.fur} />
      <ellipse cx="0" cy="26" rx="18" ry="16" fill={n.muzzle} opacity="0.28" />
      {/* resting (left) arm */}
      <ellipse cx="-26" cy="12" rx="9" ry="20" fill={n.fur} transform="rotate(-12 -26 12)" />
      {/* head */}
      <ellipse cx="0" cy="-22" rx="22" ry="20" fill={n.fur} />
      {/* ears */}
      <circle cx="-17" cy="-38" r="7" fill={n.fur} />
      <circle cx="17" cy="-38" r="7" fill={n.fur} />
      <circle cx="-17" cy="-38" r="3.5" fill={n.muzzle} opacity="0.6" />
      <circle cx="17" cy="-38" r="3.5" fill={n.muzzle} opacity="0.6" />
      {/* muzzle */}
      <ellipse cx="0" cy="-14" rx="11" ry="8" fill={n.muzzle} />
      <ellipse cx="0" cy="-19" rx="3" ry="2.4" fill={n.nose} />
      <path d="M -3 -15 Q 0 -12 3 -15" fill="none" stroke={n.nose} strokeWidth="1.4" strokeLinecap="round" />
      {/* eyes — moonlit */}
      <circle cx="-9" cy="-26" r="2.4" fill={n.nose} />
      <circle cx="9" cy="-26" r="2.4" fill={n.nose} />
      <circle cx="-8" cy="-27" r="0.9" fill={n.star} />
      <circle cx="10" cy="-27" r="0.9" fill={n.star} />

      {/* Waving paw — pivots around the shoulder (26, 10).
          Wraps a translate parent so framer-motion's rotate keyframes
          don't clobber the position offset. */}
      <g transform="translate(26 10)">
        <motion.g
          data-slot="footer-bear-paw"
          animate={reduce ? undefined : { rotate: [0, -22, -8, -26, 0] }}
          transition={{
            duration: 2.6,
            repeat: reduce ? 0 : Infinity,
            ease: "easeInOut",
            repeatDelay: 1.8,
          }}
          style={{ transformOrigin: "0 0" }}
        >
          <ellipse cx="2" cy="-2" rx="9" ry="20" fill={n.fur} transform="rotate(18 2 -2)" />
          <circle cx="10" cy="-22" r="6.5" fill={n.fur} />
          <circle cx="11" cy="-23" r="2.2" fill={n.muzzle} opacity="0.55" />
        </motion.g>
      </g>
    </g>
  );
}
