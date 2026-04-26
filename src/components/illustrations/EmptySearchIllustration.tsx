// cf-93rb Phase E — illustration for the search no-results state.
//
// Visual cousin of EmptyCartIllustration: same layered Blue Ridge palette
// (cf-navy + Mountain Blue), with a stylized magnifying glass scanning
// across the ridge. The glass barrel sits at a slight tilt so it reads as
// "still looking" rather than "found nothing" — the no-results copy
// already carries the absence, and we don't want the illustration to feel
// like a brick wall to the user. cf-cta accent on the ring keeps the
// brand color present.

export function EmptySearchIllustration({
  className,
}: {
  className?: string;
}) {
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
        <linearGradient id="empty-search-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF8F0" />
          <stop offset="100%" stopColor="#F5F0E8" />
        </linearGradient>
      </defs>

      <rect width="220" height="140" rx="12" fill="url(#empty-search-sky)" />

      {/* Distant ridge — pale Mountain Blue, mirrors EmptyCartIllustration */}
      <path
        d="M0 88 C 36 72, 72 78, 110 68 C 142 60, 174 72, 220 64 L 220 140 L 0 140 Z"
        fill="#B8D0E0"
        opacity="0.8"
      />

      {/* Mid ridge — Mountain Blue */}
      <path
        d="M0 102 C 32 90, 64 96, 104 84 C 136 76, 170 92, 200 84 C 210 82, 218 84, 220 84 L 220 140 L 0 140 Z"
        fill="#5B8FA8"
        opacity="0.85"
      />

      {/* Foreground ridge — cf-navy */}
      <path
        d="M0 116 C 28 102, 60 108, 96 100 C 128 92, 158 106, 196 100 C 208 98, 216 100, 220 100 L 220 140 L 0 140 Z"
        fill="#1E3A5F"
      />

      {/* Magnifying glass scanning the ridge — slight tilt so the
          composition reads as in-motion, not a dead-end. */}
      <g transform="translate(108 68) rotate(-18)">
        {/* Glass body — warm cream interior so the brand palette shows
            through from the back. */}
        <circle r="22" fill="#FFFCE8" stroke="#3A2518" strokeWidth="2.4" />
        {/* Inner ring — cf-cta accent ties to the rest of the brand
            palette and keeps the eye on the search target. */}
        <circle r="22" fill="none" stroke="#E8845C" strokeWidth="1" opacity="0.7" />
        {/* Hint of ridge inside the glass to suggest it's actively
            scanning the landscape rather than empty. */}
        <path
          d="M-18 4 C -10 -2, -4 2, 4 -4 C 12 -8, 18 -2, 22 -4"
          fill="none"
          stroke="#5B8FA8"
          strokeWidth="1.4"
          opacity="0.6"
        />
        {/* Handle — same espresso ink as the body */}
        <line
          x1="16"
          y1="16"
          x2="36"
          y2="36"
          stroke="#3A2518"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <line
          x1="16"
          y1="16"
          x2="36"
          y2="36"
          stroke="#5C4033"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.7"
        />
      </g>
    </svg>
  );
}
