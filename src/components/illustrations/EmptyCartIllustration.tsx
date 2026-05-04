import { Bear } from "@/components/mascot/MascotCharacters";
import { V3_PAL as c } from "@/components/mascot/MascotPalette";

export function EmptyCartIllustration({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      aria-hidden="true"
      data-slot="empty-cart-illustration"
      viewBox="0 0 220 140"
      width="220"
      height="140"
      className={`pointer-events-none ${className ?? ""}`.trim()}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ec-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.sky2} />
          <stop offset="100%" stopColor={c.cream} />
        </linearGradient>
      </defs>
      <rect width="220" height="140" rx="12" fill="url(#ec-sky)" />
      <path
        d="M0 80 C 40 66, 90 72, 130 64 C 162 58, 192 68, 220 62 L 220 140 L 0 140 Z"
        fill={c.ridge5}
        opacity="0.8"
      />
      <path
        d="M0 98 C 32 84, 72 90, 110 82 C 144 76, 180 88, 220 82 L 220 140 L 0 140 Z"
        fill={c.ridge3}
      />
      <path
        d="M0 116 C 28 104, 64 110, 100 102 C 132 96, 164 108, 220 102 L 220 140 L 0 140 Z"
        fill={c.ridge1}
      />
      {/* Sleeping bear — peaceful empty-cart state */}
      <g transform="translate(110 108)">
        <Bear pose="sleeping" scale={0.35} />
      </g>
    </svg>
  );
}
