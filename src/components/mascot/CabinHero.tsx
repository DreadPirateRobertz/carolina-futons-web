// Daytime cabin scene: bear sitting outside a Blue Ridge log cabin.
// Represents the physical store — "come find us" (v3-03-cabin).

import { V3_PAL as c } from "./MascotPalette";

type Props = { className?: string };

function PineSilhouette({ x, scale = 1 }: { x: number; scale?: number }) {
  return (
    <g transform={`translate(${x} 0) scale(${scale})`} fill={c.pine}>
      <rect x="-3" y="0" width="6" height="14" />
      <polygon points="0,-58 -18,-30 18,-30" />
      <polygon points="0,-40 -22,-12 22,-12" />
      <polygon points="0,-20 -26,6 26,6" />
    </g>
  );
}

function BearSitting({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {/* Body */}
      <ellipse cx="0" cy="0" rx="52" ry="46" fill={c.bearFur} />
      {/* Head */}
      <ellipse cx="2" cy="-54" rx="36" ry="32" fill={c.bearFur} />
      {/* Ears */}
      <circle cx="-20" cy="-80" r="13" fill={c.bearFur} />
      <circle cx="24" cy="-80" r="13" fill={c.bearFur} />
      <circle cx="-20" cy="-80" r="7" fill={c.bearFurLight} />
      <circle cx="24" cy="-80" r="7" fill={c.bearFurLight} />
      {/* Muzzle */}
      <ellipse cx="4" cy="-40" rx="18" ry="12" fill={c.bearMuzzle} />
      <ellipse cx="4" cy="-36" rx="6" ry="4" fill={c.bearNose} />
      {/* Eyes */}
      <circle cx="-12" cy="-58" r="4" fill={c.cream} />
      <circle cx="16" cy="-58" r="4" fill={c.cream} />
      <circle cx="-11" cy="-58" r="2" fill={c.bearNose} />
      <circle cx="17" cy="-58" r="2" fill={c.bearNose} />
      {/* Belly */}
      <ellipse cx="2" cy="6" rx="32" ry="28" fill={c.bearFurLight} opacity="0.55" />
      {/* Arms on knees */}
      <ellipse cx="-44" cy="20" rx="14" ry="8" fill={c.bearFur} transform="rotate(-20 -44 20)" />
      <ellipse cx="48" cy="20" rx="14" ry="8" fill={c.bearFur} transform="rotate(20 48 20)" />
      {/* Legs / haunches */}
      <ellipse cx="-28" cy="38" rx="24" ry="12" fill={c.bearFur} />
      <ellipse cx="30" cy="38" rx="24" ry="12" fill={c.bearFur} />
    </g>
  );
}

function Cabin({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke={c.ink} strokeWidth="2" fill="none">
      {/* Cabin body */}
      <rect x="-220" y="-200" width="440" height="200" fill={c.ink} />
      {/* Log texture lines */}
      {[-180, -150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((yy) => (
        <line
          key={yy}
          x1="-220"
          y1={yy}
          x2="220"
          y2={yy}
          stroke={c.bearFurLight}
          strokeWidth="1.5"
          opacity="0.4"
        />
      ))}
      {/* Roof */}
      <polygon points="-260,-200 260,-200 0,-360" fill={c.ridge1} />
      <line x1="-260" y1="-200" x2="0" y2="-360" stroke={c.inkSoft} strokeWidth="3" />
      <line x1="260" y1="-200" x2="0" y2="-360" stroke={c.inkSoft} strokeWidth="3" />
      {/* Ridge cap */}
      <line x1="0" y1="-360" x2="0" y2="-350" stroke={c.paper} strokeWidth="4" />
      {/* Door */}
      <rect x="-40" y="-160" width="80" height="160" rx="6" fill={c.bearFurLight} opacity="0.9" />
      <rect x="-40" y="-160" width="80" height="160" rx="6" />
      <circle cx="28" cy="-80" r="5" fill={c.ink} />
      {/* Sign above door */}
      <rect x="-80" y="-190" width="160" height="28" rx="4" fill={c.paper} />
      <text
        x="0"
        y="-170"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontSize="16"
        fontWeight="700"
        fill={c.ink}
        stroke="none"
      >
        Carolina Futons
      </text>
      {/* Left window */}
      <rect x="-190" y="-160" width="80" height="80" rx="4" fill={c.sky1} opacity="0.7" />
      <rect x="-190" y="-160" width="80" height="80" rx="4" />
      <line x1="-190" y1="-120" x2="-110" y2="-120" strokeWidth="1.5" />
      <line x1="-150" y1="-160" x2="-150" y2="-80" strokeWidth="1.5" />
      {/* Right window */}
      <rect x="110" y="-160" width="80" height="80" rx="4" fill={c.sky1} opacity="0.7" />
      <rect x="110" y="-160" width="80" height="80" rx="4" />
      <line x1="110" y1="-120" x2="190" y2="-120" strokeWidth="1.5" />
      <line x1="150" y1="-160" x2="150" y2="-80" strokeWidth="1.5" />
      {/* Porch railing */}
      <line x1="-220" y1="0" x2="-260" y2="0" stroke={c.paper} strokeWidth="4" />
      <line x1="220" y1="0" x2="260" y2="0" stroke={c.paper} strokeWidth="4" />
      <rect x="-270" y="-16" width="16" height="16" fill={c.sand} stroke={c.ink} strokeWidth="2" />
      <rect x="254" y="-16" width="16" height="16" fill={c.sand} stroke={c.ink} strokeWidth="2" />
      {/* Steps */}
      <rect x="-60" y="0" width="120" height="14" fill={c.sand} />
      <rect x="-50" y="14" width="100" height="12" fill={c.paperWarm} />
    </g>
  );
}

export function CabinHero({ className }: Props = {}) {
  return (
    <svg
      viewBox="0 0 1920 800"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      style={{ display: "block", width: "100%", height: "100%" }}
      aria-label="Bear sitting outside a cozy Blue Ridge log cabin storefront"
    >
      <defs>
        <linearGradient id="ch-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C8E0F0" />
          <stop offset="60%" stopColor="#D8EAF5" />
          <stop offset="100%" stopColor={c.sky2} />
        </linearGradient>
        <filter id="ch-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves={3} seed={5} />
          <feColorMatrix values="0 0 0 0 0.14  0 0 0 0 0.10  0 0 0 0 0.06  0 0 0 0.16 0" />
        </filter>
      </defs>

      {/* Sky */}
      <rect width="1920" height="800" fill="url(#ch-sky)" />

      {/* Far mountains */}
      <path
        d="M 0 400 Q 320 320 480 340 Q 640 360 800 320 Q 960 280 1120 320 Q 1280 360 1440 330 Q 1600 300 1920 350 L 1920 800 L 0 800 Z"
        fill={c.ridge4}
      />
      <path
        d="M 0 460 Q 300 400 520 420 Q 740 440 960 410 Q 1180 380 1400 420 Q 1620 460 1920 430 L 1920 800 L 0 800 Z"
        fill={c.ridge3}
      />
      <path
        d="M 0 520 Q 280 480 540 500 Q 800 520 960 490 Q 1120 460 1380 500 Q 1640 540 1920 510 L 1920 800 L 0 800 Z"
        fill={c.ridge2}
      />

      {/* Foreground hill / ground */}
      <path
        d="M 0 640 Q 480 610 960 620 T 1920 640 L 1920 800 L 0 800 Z"
        fill={c.ridge1}
      />

      {/* Ground plane */}
      <rect x="0" y="700" width="1920" height="100" fill={c.ink} />

      {/* Pine trees — left cluster */}
      <g transform="translate(0 640)">
        <PineSilhouette x={200} scale={1.4} />
        <PineSilhouette x={310} scale={1.8} />
        <PineSilhouette x={150} scale={1.0} />
      </g>

      {/* Pine trees — right cluster */}
      <g transform="translate(0 640)">
        <PineSilhouette x={1620} scale={1.4} />
        <PineSilhouette x={1740} scale={1.8} />
        <PineSilhouette x={1830} scale={1.0} />
      </g>

      {/* Cabin centered */}
      <Cabin x={960} y={680} />

      {/* Bear sitting to the right of the cabin entrance */}
      <BearSitting x={1180} y={690} />

      {/* Warm light patch on ground (late morning sun) */}
      <ellipse cx="960" cy="740" rx="380" ry="24" fill={c.sun} opacity="0.18" />

      {/* Film grain */}
      <rect
        width="1920"
        height="800"
        filter="url(#ch-grain)"
        opacity="0.4"
        style={{ mixBlendMode: "multiply" }}
      />
    </svg>
  );
}
