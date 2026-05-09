// cf-93rb Phase E — comfort-level callout band for the PDP.
//
// Three cards (Plush / Medium / Firm) placed between product description and
// reviews. Each card carries a small inline SVG that visually encodes the
// comfort spectrum using the Blue Ridge palette: figure posture (reclined /
// seated / upright) against a mountain ridgeline. Static and decorative —
// aria-hidden on each SVG; the label text is the accessible name.

function PlushScene() {
  return (
    <svg
      viewBox="0 0 120 72"
      width="120"
      height="72"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ps-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF8F0" />
          <stop offset="100%" stopColor="#F5ECD8" />
        </linearGradient>
      </defs>
      <rect width="120" height="72" fill="url(#ps-sky)" />
      {/* Distant ridge */}
      <path d="M0 44 C 20 36, 50 40, 80 34 C 100 30, 112 36, 120 33 L 120 72 L 0 72 Z" fill="#B8D0E0" opacity="0.7" />
      {/* Mid ridge */}
      <path d="M0 54 C 18 46, 42 50, 68 43 C 90 38, 108 48, 120 44 L 120 72 L 0 72 Z" fill="#5B8FA8" opacity="0.8" />
      {/* Foreground */}
      <path d="M0 62 C 16 56, 38 59, 64 54 C 86 50, 106 58, 120 54 L 120 72 L 0 72 Z" fill="#1E3A5F" />
      {/* Figure reclining — head tilted back, shoulders low, legs extended */}
      <ellipse cx="60" cy="44" rx="14" ry="5" fill="#F5ECD8" opacity="0.85" />
      <circle cx="70" cy="40" r="4" fill="#A8CCD8" opacity="0.8" />
      <path d="M60 42 Q54 44 48 42" stroke="#5B8FA8" strokeWidth="1.5" fill="none" opacity="0.6" />
    </svg>
  );
}

function MediumScene() {
  return (
    <svg
      viewBox="0 0 120 72"
      width="120"
      height="72"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ms-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF8F0" />
          <stop offset="100%" stopColor="#F5ECD8" />
        </linearGradient>
      </defs>
      <rect width="120" height="72" fill="url(#ms-sky)" />
      <path d="M0 44 C 22 38, 52 42, 82 35 C 102 30, 114 38, 120 35 L 120 72 L 0 72 Z" fill="#B8D0E0" opacity="0.7" />
      <path d="M0 54 C 20 47, 46 51, 72 44 C 92 40, 110 49, 120 45 L 120 72 L 0 72 Z" fill="#5B8FA8" opacity="0.8" />
      <path d="M0 63 C 18 57, 40 61, 66 55 C 88 51, 108 59, 120 56 L 120 72 L 0 72 Z" fill="#1E3A5F" />
      {/* Figure seated — upright torso, slightly relaxed */}
      <rect x="53" y="41" width="6" height="11" rx="2" fill="#A8CCD8" opacity="0.75" />
      <circle cx="56" cy="38" r="4" fill="#A8CCD8" opacity="0.8" />
      <path d="M50 46 Q46 50 45 54" stroke="#5B8FA8" strokeWidth="1.5" fill="none" opacity="0.5" />
      <path d="M62 46 Q66 50 67 54" stroke="#5B8FA8" strokeWidth="1.5" fill="none" opacity="0.5" />
    </svg>
  );
}

function FirmScene() {
  return (
    <svg
      viewBox="0 0 120 72"
      width="120"
      height="72"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="fs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#EFF5FA" />
          <stop offset="100%" stopColor="#E5EFF5" />
        </linearGradient>
      </defs>
      <rect width="120" height="72" fill="url(#fs-sky)" />
      <path d="M0 42 C 16 30, 44 38, 70 30 C 92 24, 110 34, 120 30 L 120 72 L 0 72 Z" fill="#9DC0D5" opacity="0.65" />
      <path d="M0 52 C 18 42, 46 48, 74 40 C 96 34, 112 44, 120 40 L 120 72 L 0 72 Z" fill="#4A7D94" opacity="0.8" />
      <path d="M0 62 C 20 54, 48 59, 76 52 C 98 47, 114 57, 120 53 L 120 72 L 0 72 Z" fill="#1E3A5F" />
      {/* Figure standing upright — very straight posture */}
      <rect x="55" y="34" width="5" height="16" rx="1" fill="#5B8FA8" opacity="0.7" />
      <circle cx="57" cy="31" r="4" fill="#A8CCD8" opacity="0.85" />
      <line x1="55" y1="50" x2="52" y2="60" stroke="#3D6B80" strokeWidth="1.5" opacity="0.5" />
      <line x1="60" y1="50" x2="63" y2="60" stroke="#3D6B80" strokeWidth="1.5" opacity="0.5" />
    </svg>
  );
}

const COMFORT_CARDS = [
  {
    slug: "plush",
    label: "Plush",
    tagline: "Cloud-soft support",
    scene: <PlushScene />,
  },
  {
    slug: "medium",
    label: "Medium",
    tagline: "Balanced everyday comfort",
    scene: <MediumScene />,
  },
  {
    slug: "firm",
    label: "Firm",
    tagline: "Structured, supportive feel",
    scene: <FirmScene />,
  },
] as const;

export function PdpComfortBand() {
  return (
    <section
      className="mt-16 max-w-3xl border-t border-cf-divider pt-10"
      aria-label="Comfort levels"
      data-slot="pdp-comfort-band"
    >
      <h2 className="font-heading text-lg font-semibold text-cf-espresso">
        Choose your comfort
      </h2>
      <p className="mt-1 text-sm text-cf-espresso/70">
        All mattresses are available in three comfort profiles — customized for
        how you sleep.
      </p>
      <ul className="mt-4 grid grid-cols-3 gap-3" role="list">
        {COMFORT_CARDS.map((card) => (
          <li
            key={card.slug}
            className="flex flex-col items-center gap-2 rounded-lg border border-cf-divider bg-cf-cream/40 p-3 text-center"
          >
            {card.scene}
            <span className="font-heading text-sm font-semibold text-cf-espresso">
              {card.label}
            </span>
            <span className="text-xs text-cf-espresso/70">{card.tagline}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
