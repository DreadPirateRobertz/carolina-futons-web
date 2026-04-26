// cf-93rb Phase E — illustration for the 404 not-found page.
//
// A weathered trail sign post planted at the edge of a Blue Ridge ridgeline:
// the path literally ends here. Uses the same cf-navy / Mountain Blue / warm
// cream palette as the other Phase E illustrations. aria-hidden — the heading
// copy already communicates the empty state.

export function NotFoundIllustration({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      aria-hidden="true"
      data-slot="not-found-illustration"
      viewBox="0 0 220 140"
      width="220"
      height="140"
      className={`pointer-events-none ${className ?? ""}`.trim()}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="nf-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF8F0" />
          <stop offset="100%" stopColor="#F5F0E8" />
        </linearGradient>
      </defs>

      {/* Sky */}
      <rect width="220" height="140" rx="12" fill="url(#nf-sky)" />

      {/* Distant ridge — pale Mountain Blue */}
      <path
        d="M0 92 C 30 76, 70 82, 110 70 C 148 60, 180 74, 220 66 L 220 140 L 0 140 Z"
        fill="#B8D0E0"
        opacity="0.75"
      />

      {/* Mid ridge */}
      <path
        d="M0 106 C 28 92, 62 98, 100 88 C 136 78, 168 94, 198 86 C 210 84, 218 86, 220 86 L 220 140 L 0 140 Z"
        fill="#5B8FA8"
        opacity="0.82"
      />

      {/* Foreground ridge — cf-navy */}
      <path
        d="M0 120 C 24 108, 56 114, 92 106 C 126 98, 158 112, 196 106 C 208 104, 216 106, 220 106 L 220 140 L 0 140 Z"
        fill="#1E3A5F"
      />

      {/* Sign post — planted in the foreground ridge */}
      {/* Vertical post */}
      <rect x="108" y="72" width="4" height="38" rx="1" fill="#3A2518" />

      {/* Upper sign pointing nowhere — slight angle */}
      <g transform="translate(82 78) rotate(-4)">
        <rect width="44" height="14" rx="2" fill="#F5ECD8" stroke="#3A2518" strokeWidth="1.2" />
        {/* Diagonal stripe — "trail ends" marker */}
        <line x1="6" y1="2" x2="2" y2="12" stroke="#E8845C" strokeWidth="1.2" opacity="0.7" />
        <line x1="11" y1="2" x2="7" y2="12" stroke="#E8845C" strokeWidth="1.2" opacity="0.7" />
        {/* "?" text stand-in — three dots suggesting uncertainty */}
        <circle cx="22" cy="7" r="1.2" fill="#3A2518" opacity="0.6" />
        <circle cx="26" cy="7" r="1.2" fill="#3A2518" opacity="0.6" />
        <circle cx="30" cy="7" r="1.2" fill="#3A2518" opacity="0.6" />
      </g>

      {/* Lower sign — blank, the path just stops here */}
      <g transform="translate(108 90)">
        <rect x="4" width="38" height="12" rx="2" fill="#F5ECD8" stroke="#3A2518" strokeWidth="1.2" />
        {/* Blank — intentionally empty */}
        <line x1="9" y1="6" x2="37" y2="6" stroke="#3A2518" strokeWidth="0.8" opacity="0.2" />
      </g>

      {/* Small pine trees at edge of ridge */}
      <g fill="#4A7C59" opacity="0.5">
        <polygon points="38,120 42,108 46,120" />
        <polygon points="40,112 43,104 46,112" />
        <polygon points="168,118 172,106 176,118" />
        <polygon points="170,110 173,102 176,110" />
      </g>
    </svg>
  );
}
