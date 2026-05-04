"use client";

// LivingFooterScene — v3 mascot scene layered over LivingFooterBg.
// SVG background is transparent so the animated atmosphere shows through.
// Uses the V3 palette for ridges/pines/bear but drops the static sky rect.

import { V3_PAL as c } from "@/components/mascot/MascotPalette";
import { Bear } from "@/components/mascot/MascotCharacters";

const PINE_POSITIONS = [
  { x: 120, y: 158, h: 32, w: 10 },
  { x: 160, y: 162, h: 26, w: 8 },
  { x: 1760, y: 155, h: 34, w: 10 },
  { x: 1800, y: 160, h: 28, w: 9 },
  { x: 1840, y: 158, h: 22, w: 7 },
  { x: 400, y: 165, h: 20, w: 7 },
  { x: 1520, y: 163, h: 24, w: 8 },
];

// Mist particles rise from the near-ridge floor — ambient valley fog.
// Color: ridge5 (lightest Blue Ridge mist) at 40% alpha. Distinct from the
// header's warm amber orbs and white/silver star field.
const MIST_FILL = c.ridge5 + "66"; // hex alpha 66 ≈ 40 % opacity
const MIST_PARTICLES: ReadonlyArray<{
  cx: number;
  cy: number;
  r: number;
  mx: number;
  dur: string;
  delay: string;
}> = [
  { cx: 200,  cy: 93, r: 2.5, mx: -6,  dur: "5.8s", delay: "0.0s" },
  { cx: 480,  cy: 91, r: 2.0, mx: 5,   dur: "6.4s", delay: "1.3s" },
  { cx: 760,  cy: 94, r: 2.8, mx: -7,  dur: "5.2s", delay: "0.6s" },
  { cx: 960,  cy: 88, r: 2.0, mx: 4,   dur: "7.1s", delay: "2.2s" },
  { cx: 1160, cy: 92, r: 2.3, mx: -5,  dur: "6.0s", delay: "0.9s" },
  { cx: 1380, cy: 90, r: 2.7, mx: 6,   dur: "5.5s", delay: "1.7s" },
  { cx: 1600, cy: 93, r: 2.1, mx: -8,  dur: "6.8s", delay: "0.3s" },
  { cx: 640,  cy: 95, r: 2.4, mx: 7,   dur: "5.9s", delay: "2.8s" },
  { cx: 1100, cy: 89, r: 1.8, mx: -4,  dur: "6.3s", delay: "0.5s" },
  { cx: 1520, cy: 92, r: 2.6, mx: 3,   dur: "5.7s", delay: "1.4s" },
];

function PineTree({ x, y, h, w }: { x: number; y: number; h: number; w: number }) {
  return (
    <polygon
      points={`${x},${y - h} ${x - w},${y} ${x + w},${y}`}
      fill={c.ridge1}
      opacity="0.9"
    />
  );
}

export function LivingFooterScene() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-0 z-10 h-[120px] w-full"
    >
      <svg
        viewBox="0 0 1920 120"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMax slice"
        style={{ display: "block", width: "100%", height: "100%" }}
      >
        <defs>
          <style>{`
            @keyframes lfs-bear-breathe {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.03); }
            }
            @keyframes lfs-mist-rise {
              0%   { transform: translate(0px, 0px); opacity: 0; }
              12%  { opacity: 0.55; }
              88%  { opacity: 0.2; }
              100% { transform: translate(var(--mx), -64px); opacity: 0; }
            }
            @media (prefers-reduced-motion: no-preference) {
              .lfs-bear-breathe {
                transform-box: fill-box;
                transform-origin: center;
                animation: lfs-bear-breathe 3s ease-in-out infinite;
              }
              .lfs-mist {
                animation: lfs-mist-rise var(--md) ease-in-out var(--ml) infinite;
              }
            }
          `}</style>
        </defs>
        {/* Distant ridge — semi-transparent so atmosphere bleeds through */}
        <path
          d="M 0 60 Q 240 42 480 52 Q 720 62 960 38 Q 1200 14 1440 55 Q 1680 96 1920 62 L 1920 120 L 0 120 Z"
          fill={c.ridge3}
          opacity="0.45"
        />
        {/* Mid ridge */}
        <path
          d="M 0 78 Q 200 60 400 70 Q 600 80 800 62 Q 1040 42 1240 74 Q 1480 108 1680 78 L 1920 78 L 1920 120 L 0 120 Z"
          fill={c.ridge2}
          opacity="0.65"
        />
        {/* Pine trees along the ridge */}
        {PINE_POSITIONS.map((p, i) => (
          <PineTree key={i} {...p} />
        ))}
        {/* Near ridge — solid, sets the footer floor */}
        <path
          d="M 0 96 Q 240 88 480 94 Q 720 100 960 90 Q 1200 80 1440 94 Q 1680 110 1920 96 L 1920 120 L 0 120 Z"
          fill={c.ridge1}
        />
        {/* Valley mist particles: cool blue-white (ridge5) rising from the near
            ridge floor. Distinct from the header's warm amber orbs and white stars. */}
        {MIST_PARTICLES.map((p, i) => (
          <circle
            key={i}
            className="lfs-mist"
            cx={p.cx}
            cy={p.cy}
            r={p.r}
            fill={MIST_FILL}
            style={
              {
                "--mx": `${p.mx}px`,
                "--md": p.dur,
                "--ml": p.delay,
              } as React.CSSProperties
            }
          />
        ))}
        {/* Sleeping bear: outer g positions, inner g animates (avoids CSS transform fighting SVG translate) */}
        <g transform="translate(960 90)">
          <g className="lfs-bear-breathe">
            <Bear pose="sleeping" scale={0.55} />
          </g>
        </g>
      </svg>
    </div>
  );
}
