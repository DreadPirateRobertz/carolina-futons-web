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
        {/* Sleeping bear centered on the near ridge */}
        <g transform="translate(960 90)">
          <Bear pose="sleeping" scale={0.55} />
        </g>
      </svg>
    </div>
  );
}
