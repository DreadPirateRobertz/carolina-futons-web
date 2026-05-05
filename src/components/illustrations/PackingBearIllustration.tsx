// cfw-pm3: distinct V3 mascot scene for the populated /cart page.
// Bear peeking out from behind a wrapped parcel — reads as "your order
// is being packed". Mood: alert + helpful (vs the empty-cart sleeping
// bear, the footer's watchful sitting bear, and the header world bear).

import { Bear } from "@/components/mascot/MascotCharacters";
import { V3_PAL as c } from "@/components/mascot/MascotPalette";

export function PackingBearIllustration({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      aria-hidden="true"
      data-slot="packing-bear-illustration"
      viewBox="0 0 220 140"
      width="220"
      height="140"
      className={`pointer-events-none ${className ?? ""}`.trim()}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="pb-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.sky2} />
          <stop offset="100%" stopColor={c.cream} />
        </linearGradient>
      </defs>
      <rect width="220" height="140" rx="12" fill="url(#pb-sky)" />

      {/* Distant ridges — pair visually with EmptyCartIllustration. */}
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

      {/* Wrapped parcel — kraft-paper box, twine crisscross, bow, gift tag. */}
      <g data-slot="packing-bear-parcel" transform="translate(110 116)">
        <rect x="-30" y="-26" width="60" height="32" rx="2" fill={c.sand} />
        <rect x="-30" y="-26" width="60" height="32" rx="2" fill={c.paperWarm} opacity="0.55" />
        {/* twine */}
        <line x1="0" y1="-26" x2="0" y2="6" stroke={c.coralDark} strokeWidth="1.4" />
        <line x1="-30" y1="-10" x2="30" y2="-10" stroke={c.coralDark} strokeWidth="1.4" />
        {/* bow loops */}
        <ellipse cx="-5" cy="-26" rx="6" ry="3.4" fill={c.coral} />
        <ellipse cx="5" cy="-26" rx="6" ry="3.4" fill={c.coral} />
        <circle cx="0" cy="-26" r="1.6" fill={c.coralDark} />
        {/* tag */}
        <path
          d="M 16 -12 l 12 4 l 0 8 l -12 4 z"
          fill={c.cream}
          stroke={c.inkSoft}
          strokeWidth="0.8"
        />
        <circle cx="17.5" cy="-10" r="0.9" fill={c.inkSoft} />
        <line x1="20" y1="-7" x2="26" y2="-5.5" stroke={c.inkSoft} strokeWidth="0.6" />
        <line x1="20" y1="-4" x2="25" y2="-2.5" stroke={c.inkSoft} strokeWidth="0.6" />
      </g>

      {/* Bear peeking out from behind the parcel — different pose from
          every other mascot scene on the site. */}
      <g transform="translate(150 102)">
        <Bear pose="peeking" scale={0.32} />
      </g>
    </svg>
  );
}
