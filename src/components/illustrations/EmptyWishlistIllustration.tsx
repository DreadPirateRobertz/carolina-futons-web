// cfw-9vs: V3 spot illustration for the empty /wishlist state. Pairs with
// EmptyCartIllustration / EmptySearchIllustration in tone — same V3 palette,
// distinct subject so the page doesn't read as "your cart is empty" twice.
// The bear is sitting (alert + ready), with floating hearts to signal the
// "save things you love" intent without copy.
import { Bear } from "@/components/mascot/MascotCharacters";
import { V3_PAL as c } from "@/components/mascot/MascotPalette";

export function EmptyWishlistIllustration({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      data-slot="empty-wishlist-illustration"
      viewBox="0 0 220 140"
      width="220"
      height="140"
      className={`pointer-events-none ${className ?? ""}`.trim()}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ew-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.sky2} />
          <stop offset="100%" stopColor={c.cream} />
        </linearGradient>
      </defs>
      <rect width="220" height="140" rx="12" fill="url(#ew-sky)" />
      <path
        d="M0 86 C 40 72, 92 78, 132 70 C 164 64, 192 74, 220 68 L 220 140 L 0 140 Z"
        fill={c.ridge5}
        opacity="0.8"
      />
      <path
        d="M0 102 C 32 90, 70 96, 108 88 C 144 82, 180 94, 220 88 L 220 140 L 0 140 Z"
        fill={c.ridge3}
      />
      <path
        d="M0 118 C 28 108, 62 114, 100 106 C 132 100, 164 110, 220 106 L 220 140 L 0 140 Z"
        fill={c.ridge1}
      />
      {/* Floating hearts — gentle "save what you love" cue */}
      <Heart x={62} y={42} size={10} fill={c.coral} opacity={0.9} />
      <Heart x={148} y={32} size={14} fill={c.coralDark} opacity={0.95} />
      <Heart x={172} y={58} size={8} fill={c.coral} opacity={0.85} />
      {/* Bear sitting — ready to be paired with a saved item */}
      <g transform="translate(110 108)">
        <Bear pose="sitting" scale={0.38} />
      </g>
    </svg>
  );
}

function Heart({
  x,
  y,
  size,
  fill,
  opacity = 1,
}: {
  x: number;
  y: number;
  size: number;
  fill: string;
  opacity?: number;
}) {
  // Two arcs + a triangular tip — kept inline to avoid a dependency on a
  // shared icon set; this scales by `size` and centers on (x, y).
  const s = size / 24;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={opacity}>
      <path
        d="M12 21s-7.5-4.6-9.5-9.4C1 7.6 3.6 4 7.4 4c2 0 3.6 1.1 4.6 2.7C13 5.1 14.6 4 16.6 4 20.4 4 23 7.6 21.5 11.6 19.5 16.4 12 21 12 21z"
        fill={fill}
      />
    </g>
  );
}
