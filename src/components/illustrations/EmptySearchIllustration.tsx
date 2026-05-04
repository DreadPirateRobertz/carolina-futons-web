import { Bear } from "@/components/mascot/MascotCharacters";
import { V3_PAL as c } from "@/components/mascot/MascotPalette";

export function EmptySearchIllustration({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      aria-hidden="true"
      data-slot="empty-search-illustration"
      viewBox="0 0 220 140"
      width="220"
      height="140"
      className={`pointer-events-none ${className ?? ""}`.trim()}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="es-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.sky2} />
          <stop offset="100%" stopColor={c.cream} />
        </linearGradient>
      </defs>
      <rect width="220" height="140" rx="12" fill="url(#es-sky)" />
      <path
        d="M0 78 C 40 64, 90 70, 130 62 C 162 56, 192 66, 220 60 L 220 140 L 0 140 Z"
        fill={c.ridge5}
        opacity="0.8"
      />
      <path
        d="M0 96 C 32 82, 72 88, 110 80 C 144 74, 180 86, 220 80 L 220 140 L 0 140 Z"
        fill={c.ridge3}
      />
      <path
        d="M0 114 C 28 102, 64 108, 100 100 C 132 94, 164 106, 220 100 L 220 140 L 0 140 Z"
        fill={c.ridge1}
      />
      {/* Bear sitting on foreground ridge, curious pose */}
      <g transform="translate(100 106)">
        <Bear pose="sitting" scale={0.38} />
      </g>
      {/* Magnifying glass tilted to suggest active searching */}
      <g transform="translate(148 76) rotate(-18)">
        <circle r="13" fill={c.cream} stroke={c.inkSoft} strokeWidth="2" />
        <circle r="13" fill="none" stroke={c.coral} strokeWidth="0.9" opacity="0.7" />
        <line x1="9" y1="9" x2="22" y2="22" stroke={c.inkSoft} strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  );
}
