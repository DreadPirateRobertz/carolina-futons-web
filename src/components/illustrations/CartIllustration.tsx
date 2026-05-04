import { V3_PAL as c } from "@/components/mascot/MascotPalette";

export function CartIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 52"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      data-slot="cart-illustration"
      data-testid="cart-illustration"
      className={`pointer-events-none ${className ?? ""}`.trim()}
    >
      <defs>
        <linearGradient id="ci-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.sky2} />
          <stop offset="100%" stopColor={c.paperWarm} />
        </linearGradient>
      </defs>
      <rect width="400" height="52" fill="url(#ci-sky)" />
      <path
        d="M0 28 C 40 18, 100 25, 160 20 C 220 15, 300 23, 400 18 L400 52 L0 52Z"
        fill={c.ridge5}
        opacity="0.6"
      />
      <path
        d="M0 35 C 50 26, 110 32, 180 26 C 240 21, 320 30, 400 25 L400 52 L0 52Z"
        fill={c.ridge3}
        opacity="0.8"
      />
      <path
        d="M0 42 C 60 34, 130 39, 200 33 C 270 28, 340 38, 400 34 L400 52 L0 52Z"
        fill={c.ridge2}
      />
      {/* Futon silhouette in coral accent */}
      <rect x="176" y="26" width="48" height="9" rx="2" fill={c.coral} opacity="0.85" />
      <rect x="171" y="20" width="8" height="15" rx="1.5" fill={c.coral} opacity="0.80" />
      <rect x="221" y="20" width="8" height="15" rx="1.5" fill={c.coral} opacity="0.80" />
    </svg>
  );
}
