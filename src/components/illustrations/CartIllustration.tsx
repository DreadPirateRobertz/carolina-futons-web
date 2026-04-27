// Blue Ridge strip for the filled-cart state in CartDrawer.
// Narrow scenic band (400×52 viewBox): three ridgeline layers in the
// standard palette + a futon silhouette in cf-cta orange above the mid ridge.
// Decorative — aria-hidden. Callers are responsible for accessible context.

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
        <linearGradient id="cart-illus-sky-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF8F0" />
          <stop offset="100%" stopColor="#F5ECD8" />
        </linearGradient>
      </defs>
      <rect width="400" height="52" fill="url(#cart-illus-sky-grad)" />
      {/* Distant ridge */}
      <path
        d="M0 28 C 40 18, 100 25, 160 20 C 220 15, 300 23, 400 18 L400 52 L0 52Z"
        fill="#B8D0E0"
        opacity="0.65"
      />
      {/* Mid ridge */}
      <path
        d="M0 35 C 50 26, 110 32, 180 26 C 240 21, 320 30, 400 25 L400 52 L0 52Z"
        fill="#5B8FA8"
        opacity="0.75"
      />
      {/* Near ridge */}
      <path
        d="M0 42 C 60 34, 130 39, 200 33 C 270 28, 340 38, 400 34 L400 52 L0 52Z"
        fill="#1E3A5F"
      />
      {/* Futon silhouette above mid ridge — cf-cta orange */}
      <rect x="176" y="26" width="48" height="9" rx="2" fill="#C8763A" opacity="0.85" />
      <rect x="171" y="20" width="8" height="15" rx="1.5" fill="#C8763A" opacity="0.80" />
      <rect x="221" y="20" width="8" height="15" rx="1.5" fill="#C8763A" opacity="0.80" />
    </svg>
  );
}
