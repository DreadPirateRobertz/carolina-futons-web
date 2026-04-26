// cf-93rb Phase E — illustration for the empty-cart state.
//
// The CartDrawer previously rendered a generic Lucide ShoppingBag icon.
// Replacing it with a brand-coherent inline SVG: a folded futon frame
// silhouetted against the Blue Ridge skyline. Same palette as the rest
// of the cf-93rb illustrations (cf-navy, cf-cta accent, cf-cream warm
// neutral). Decorative — the "Your cart is empty" heading next to it
// already conveys the meaning, so aria-hidden keeps the AT tree clean.

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
      {/* Sky band — soft warm cream fading to sand so the illustration
          carries some of the same atmospheric language as LivingSky. */}
      <defs>
        <linearGradient id="empty-cart-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF8F0" />
          <stop offset="100%" stopColor="#F5F0E8" />
        </linearGradient>
      </defs>
      <rect width="220" height="140" rx="12" fill="url(#empty-cart-sky)" />

      {/* Distant ridge — pale Mountain Blue */}
      <path
        d="M0 80 C 40 64, 80 70, 120 60 C 150 52, 180 64, 220 56 L 220 140 L 0 140 Z"
        fill="#B8D0E0"
        opacity="0.8"
      />

      {/* Mid ridge — Mountain Blue */}
      <path
        d="M0 96 C 36 84, 70 90, 108 78 C 138 70, 168 84, 200 76 C 210 74, 218 76, 220 76 L 220 140 L 0 140 Z"
        fill="#5B8FA8"
        opacity="0.85"
      />

      {/* Foreground ridge — cf-navy */}
      <path
        d="M0 110 C 30 96, 64 102, 100 92 C 130 84, 160 100, 196 92 C 208 90, 216 92, 220 92 L 220 140 L 0 140 Z"
        fill="#1E3A5F"
      />

      {/* Folded futon frame — simple 3-line silhouette, parked at the
          horizon line. The cf-cta seam separates the frame slats so the
          brand orange shows through even at this size. */}
      <g transform="translate(56 72)" stroke="#3A2518" strokeLinecap="round">
        <rect x="0" y="0" width="108" height="22" rx="3" fill="#FFFCE8" stroke="#3A2518" strokeWidth="1.6" />
        <line x1="0" y1="11" x2="108" y2="11" stroke="#E8845C" strokeWidth="1.4" />
        <line x1="36" y1="0" x2="36" y2="22" strokeWidth="0.9" opacity="0.55" />
        <line x1="72" y1="0" x2="72" y2="22" strokeWidth="0.9" opacity="0.55" />
      </g>

      {/* Hand-drawn rolling pine on the foreground ridge — Coral accent
          mimicking the cf-cta hue Stilgar called for. */}
      <g fill="#1E3A5F">
        <polygon points="38,108 41,96 44,108" />
        <polygon points="46,110 49,98 52,110" />
        <polygon points="178,106 181,94 184,106" />
      </g>
      <circle cx="186" cy="92" r="3" fill="#E8845C" opacity="0.85" />
    </svg>
  );
}
