// Night scene (v3-02-stargazing palette) — bear napping under the stars.
// "Lost but peaceful" — the heading copy handles the 404 message; this
// illustration carries warmth so the page doesn't feel punishing.

import { V3_NIGHT as NIGHT } from "@/components/mascot/MascotPalette";

export function NotFoundIllustration({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      data-slot="not-found-illustration"
      viewBox="0 0 220 140"
      width="220"
      height="140"
      className={`pointer-events-none ${className ?? ""}`.trim()}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="nf-sky-v3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={NIGHT.sky0} />
          <stop offset="100%" stopColor={NIGHT.sky1} />
        </linearGradient>
      </defs>
      <rect width="220" height="140" rx="12" fill="url(#nf-sky-v3)" />
      {/* Stars */}
      {(
        [
          [28, 18, 1.2], [60, 12, 0.8], [95, 20, 1.0], [130, 10, 0.8],
          [158, 22, 1.2], [185, 14, 0.8], [44, 35, 0.8], [110, 32, 1.0],
          [170, 30, 0.8], [200, 40, 1.2],
        ] as [number, number, number][]
      ).map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={NIGHT.star} opacity="0.8" />
      ))}
      {/* Crescent moon */}
      <circle cx="178" cy="24" r="12" fill={NIGHT.moon} opacity="0.9" />
      <circle cx="183" cy="21" r="10" fill={NIGHT.sky0} />
      {/* Ridge layers */}
      <path
        d="M0 72 Q 55 58, 110 66 Q 165 74, 220 62 L 220 140 L 0 140 Z"
        fill={NIGHT.r4}
      />
      <path
        d="M0 90 Q 55 76, 110 84 Q 165 92, 220 82 L 220 140 L 0 140 Z"
        fill={NIGHT.r3}
      />
      <path
        d="M0 108 Q 55 96, 110 104 Q 165 112, 220 102 L 220 140 L 0 140 Z"
        fill={NIGHT.r2}
      />
      <path
        d="M0 122 Q 55 112, 110 118 Q 165 126, 220 116 L 220 140 L 0 140 Z"
        fill={NIGHT.r1}
      />
      {/* Sleeping bear — inline with moonlit-adjusted fur so it reads on dark ridges */}
      <g transform="translate(110 112) scale(0.32)">
        <ellipse cx="0" cy="20" rx="58" ry="22" fill={NIGHT.fur} />
        <ellipse cx="-50" cy="6" rx="22" ry="18" fill={NIGHT.fur} />
        <circle cx="-66" cy="-8" r="7" fill={NIGHT.fur} />
        <ellipse cx="-50" cy="14" rx="10" ry="6" fill={NIGHT.muzzle} />
        <ellipse cx="-58" cy="10" rx="3" ry="2" fill={NIGHT.nose} />
        <path
          d="M -56 0 q 4 0 6 -1"
          fill="none"
          stroke={NIGHT.nose}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M -42 -2 q 4 0 6 -1"
          fill="none"
          stroke={NIGHT.nose}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* z z Z */}
        <text
          x="20"
          y="-20"
          fontFamily="serif"
          fontSize="14"
          fontWeight="700"
          fill={NIGHT.star}
          opacity="0.6"
        >
          z
        </text>
        <text
          x="34"
          y="-32"
          fontFamily="serif"
          fontSize="18"
          fontWeight="700"
          fill={NIGHT.star}
          opacity="0.5"
        >
          z
        </text>
        <text
          x="50"
          y="-46"
          fontFamily="serif"
          fontSize="22"
          fontWeight="700"
          fill={NIGHT.star}
          opacity="0.4"
        >
          Z
        </text>
      </g>
    </svg>
  );
}
