"use client";

// Giant radiant sunburst — Vintage Travel Poster style.
// Used by LivingHero during dawn (h≈5-7) and dusk (h≈17-19.5) phases.
// 24 radiating rays from sun at horizon, tall mountain silhouettes below.


const DAWN = {
  sky0: "#18182A",
  sky1: "#C86848",
  sky2: "#F0A858",
  sky3: "#FABF78",
  sun: "#FAF0D0",
  sunGlow: "#F8D080",
  ray: "#FAF0D0",
  r1: "#1A0C20",
  r2: "#2A1218",
  r3: "#3A1A10",
  r4: "#5A2E18",
  pine: "#0E0812",
};

const DUSK = {
  sky0: "#201840",
  sky1: "#A03828",
  sky2: "#E07820",
  sky3: "#F8C040",
  sun: "#FAF0C0",
  sunGlow: "#F8A030",
  ray: "#FAF0C0",
  r1: "#0C0818",
  r2: "#180A10",
  r3: "#2A1008",
  r4: "#481808",
  pine: "#060410",
};

type Props = {
  phase: "dawn" | "dusk";
  time?: number;
};

const N_RAYS = 24;
const HALF_SPREAD_DEG = 82;
const RAY_LENGTH = 1100;
const RAY_BASE_HALF = 8;

function buildRays(sx: number, sy: number, color: string, time: number) {
  return Array.from({ length: N_RAYS }, (_, i) => {
    const frac = i / (N_RAYS - 1);
    const angleDeg = -HALF_SPREAD_DEG + frac * HALF_SPREAD_DEG * 2;
    const rad = (angleDeg * Math.PI) / 180;
    const tx = sx + RAY_LENGTH * Math.sin(rad);
    const ty = sy - RAY_LENGTH * Math.cos(rad);
    // perpendicular base offset
    const perpX = Math.cos(rad) * RAY_BASE_HALF;
    const perpY = Math.sin(rad) * RAY_BASE_HALF;
    // Skip Math.sin when time===0 (SSR + initial hydration frame) to avoid
    // a Node.js/browser V8 precision difference on sin(8.4 rad) that causes
    // a React hydration mismatch on i=21. Pulse kicks in after first RAF tick.
    const pulse = time === 0 ? 1 : 1 + 0.04 * Math.sin(time * 0.25 + i * 0.4);
    const op = (i % 2 === 0 ? 0.28 : 0.18) * pulse;
    return (
      <polygon
        key={i}
        // Ray tip tx/ty use Math.sin/cos(rad) which differs by ~1 ULP between
        // Node.js and browser V8 for some angles — suppressHydrationWarning
        // silences the mismatch warning. React uses server HTML as-is (correct
        // behaviour) and the sub-pixel difference is invisible.
        suppressHydrationWarning
        points={`${sx - perpX},${sy - perpY} ${sx + perpX},${sy + perpY} ${tx},${ty}`}
        fill={color}
        opacity={op}
      />
    );
  });
}

function Pine({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x="-3" y="0" width="6" height="14" fill="inherit" />
      <polygon points="0,-60 -20,-30 20,-30" fill="inherit" />
      <polygon points="0,-40 -24,-10 24,-10" fill="inherit" />
      <polygon points="0,-18 -28,12 28,12" fill="inherit" />
    </g>
  );
}

export function VintageSunRays({ phase, time = 0 }: Props) {
  const c = phase === "dawn" ? DAWN : DUSK;
  // Dawn: sun rises from left-center. Dusk: sun sets toward right-center.
  const sx = phase === "dawn" ? 480 : 1440;
  const sy = 680; // near horizon
  const sunBob = Math.sin(time * 0.3) * 3;

  return (
    <svg
      viewBox="0 0 1920 800"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      style={{ display: "block", width: "100%", height: "100%" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="vsr-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.sky0} />
          <stop offset="30%" stopColor={c.sky1} />
          <stop offset="70%" stopColor={c.sky2} />
          <stop offset="100%" stopColor={c.sky3} />
        </linearGradient>
        <radialGradient id="vsr-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={c.sun} stopOpacity="1" />
          <stop offset="35%" stopColor={c.sunGlow} stopOpacity="0.85" />
          <stop offset="70%" stopColor={c.sunGlow} stopOpacity="0.25" />
          <stop offset="100%" stopColor={c.sunGlow} stopOpacity="0" />
        </radialGradient>
        <filter id="vsr-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves={3} seed={5} />
          <feColorMatrix values="0 0 0 0 0.18  0 0 0 0 0.10  0 0 0 0 0.06  0 0 0 0.18 0" />
        </filter>
      </defs>

      {/* Sky */}
      <rect width="1920" height="800" fill="url(#vsr-sky)" />

      {/* Sun halo — large radial glow */}
      <g transform={`translate(${sx} ${sy + sunBob})`}>
        <circle r="340" fill="url(#vsr-sun)" />
      </g>

      {/* Rays behind sun */}
      <g>{buildRays(sx, sy + sunBob, c.ray, time)}</g>

      {/* Sun disc */}
      <g transform={`translate(${sx} ${sy + sunBob})`}>
        <circle r="68" fill={c.sun} />
        <circle r="52" fill={c.sun} />
      </g>

      {/* Mountain ridges */}
      <path
        d={`M 0 520 Q 320 480 640 495 T 1280 510 T 1920 520 L 1920 800 L 0 800 Z`}
        fill={c.r4}
      />
      <path
        d={`M 0 570 Q 240 530 480 545 Q 720 560 960 550 Q 1200 540 1440 558 T 1920 572 L 1920 800 L 0 800 Z`}
        fill={c.r3}
      />
      <path
        d={`M 0 620 Q 320 590 640 600 Q 960 610 1280 598 T 1920 620 L 1920 800 L 0 800 Z`}
        fill={c.r2}
      />
      <path
        d={`M 0 660 Q 480 640 960 648 T 1920 660 L 1920 800 L 0 800 Z`}
        fill={c.r1}
      />

      {/* Pine silhouettes */}
      <g fill={c.pine}>
        <Pine x={80} y={660} scale={1.4} />
        <Pine x={180} y={655} scale={1.8} />
        <Pine x={300} y={662} scale={1.2} />
        <Pine x={1600} y={658} scale={1.3} />
        <Pine x={1720} y={652} scale={1.9} />
        <Pine x={1840} y={660} scale={1.1} />
      </g>

      {/* Birds (dawn: few heading right; dusk: flock heading left) */}
      {phase === "dawn" ? (
        <g stroke={c.sky0} strokeWidth="1.4" fill="none" opacity="0.6">
          <path d={`M ${1100} 260 q 8 -4 16 0`} />
          <path d={`M ${1130} 270 q 8 -4 16 0`} />
          <path d={`M ${1160} 255 q 8 -4 16 0`} />
        </g>
      ) : (
        <g stroke={c.sky0} strokeWidth="1.4" fill="none" opacity="0.7">
          {[
            [780, 220],
            [810, 230],
            [760, 235],
            [840, 218],
            [820, 242],
          ].map(([bx, by], i) => (
            <path key={i} d={`M ${bx} ${by} q -8 -4 -16 0`} />
          ))}
        </g>
      )}

      {/* Film grain overlay */}
      <rect
        width="1920"
        height="800"
        filter="url(#vsr-grain)"
        opacity="0.35"
        style={{ mixBlendMode: "multiply" }}
      />
    </svg>
  );
}
