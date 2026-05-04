// v3-06-fog.svg — quiet foggy ridge for /contact + /press hero.
// Inline SVG keeps it zero-request and styleable via className.

export type FogSceneProps = {
  className?: string;
};

export function FogScene({ className }: FogSceneProps) {
  return (
    <div
      data-slot="fog-scene"
      className={`pointer-events-none w-full select-none leading-none ${className ?? ""}`.trim()}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1920 800"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block", width: "100%", height: "100%" }}
      >
        <defs>
          <linearGradient id="hf-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E8DDD0" />
            <stop offset="100%" stopColor="#D8C8B8" />
          </linearGradient>
          <radialGradient id="hf-sun" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FAF2DE" />
            <stop offset="60%" stopColor="#FAE8B0" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#FAE8B0" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="hf-fog1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F5ECDE" stopOpacity="0" />
            <stop offset="50%" stopColor="#F5ECDE" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#F5ECDE" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="hf-fog2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F5ECDE" stopOpacity="0" />
            <stop offset="50%" stopColor="#F5ECDE" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#F5ECDE" stopOpacity="0" />
          </linearGradient>
          <filter id="hf-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves={3} seed={19} />
            <feColorMatrix values="0 0 0 0 0.18  0 0 0 0 0.10  0 0 0 0 0.06  0 0 0 0.16 0" />
          </filter>
        </defs>

        {/* Sky */}
        <rect width="1920" height="800" fill="url(#hf-sky)" />

        {/* Sun glow */}
        <circle cx="1204" cy="276" r="320" fill="url(#hf-sun)" />
        <circle cx="1204" cy="276" r="64" fill="#FAF2DE" opacity="0.85" />

        {/* Ridge layers + fog bands */}
        <path d="M 0 330.4 Q 480 310.4 960 320.4 T 1920 330.4 L 1920 800 L 0 800 Z" fill="#BBC8D8" />
        <rect x="0" y="340.4" width="1920" height="60" fill="url(#hf-fog1)" />
        <path d="M 0 383.6 Q 480 358.6 960 371.6 T 1920 383.6 L 1920 800 L 0 800 Z" fill="#9BA8B8" />
        <rect x="0" y="393.6" width="1920" height="50" fill="url(#hf-fog2)" />
        <path d="M 0 429.6 Q 480 404.6 960 417.6 T 1920 429.6 L 1920 800 L 0 800 Z" fill="#7B8898" />
        <rect
          x="0"
          y="439.6"
          width="1920"
          height="44"
          fill="url(#hf-fog1)"
          opacity="0.85"
          transform="translate(-28.687665958582237 0)"
        />
        <path d="M 0 466 Q 480 431 960 444 T 1920 461 L 1920 800 L 0 800 Z" fill="#5B6878" />
        <path d="M 0 532 Q 480 492 960 507 T 1920 532 L 1920 800 L 0 800 Z" fill="#3A4858" />

        {/* Pine silhouettes */}
        <g transform="translate(0 492)">
          <g transform="translate(100 0) scale(1.4)">
            <rect x="-2" y="0" width="4" height="10" fill="#3A2518" />
            <polygon points="0,-50 -16,-26 16,-26" fill="#1F3A2A" />
            <polygon points="0,-32 -18,-8 18,-8" fill="#1F3A2A" />
            <polygon points="0,-14 -20,8 20,8" fill="#1F3A2A" />
          </g>
          <g transform="translate(220 0) scale(1.8)">
            <rect x="-2" y="0" width="4" height="10" fill="#3A2518" />
            <polygon points="0,-50 -16,-26 16,-26" fill="#1F3A2A" />
            <polygon points="0,-32 -18,-8 18,-8" fill="#1F3A2A" />
            <polygon points="0,-14 -20,8 20,8" fill="#1F3A2A" />
          </g>
          <g transform="translate(1700 0) scale(1.4)">
            <rect x="-2" y="0" width="4" height="10" fill="#3A2518" />
            <polygon points="0,-50 -16,-26 16,-26" fill="#1F3A2A" />
            <polygon points="0,-32 -18,-8 18,-8" fill="#1F3A2A" />
            <polygon points="0,-14 -20,8 20,8" fill="#1F3A2A" />
          </g>
          <g transform="translate(1820 0) scale(1.8)">
            <rect x="-2" y="0" width="4" height="10" fill="#3A2518" />
            <polygon points="0,-50 -16,-26 16,-26" fill="#1F3A2A" />
            <polygon points="0,-32 -18,-8 18,-8" fill="#1F3A2A" />
            <polygon points="0,-14 -20,8 20,8" fill="#1F3A2A" />
          </g>
        </g>

        {/* Bear silhouette in valley */}
        <g transform="translate(960 580) scale(2.4)">
          <ellipse cx="0" cy="6" rx="38" ry="5" fill="#1F1208" opacity="0.4" />
          <ellipse cx="0" cy="-20" rx="22" ry="32" fill="#1F1208" />
          <rect x="-14" y="0" width="10" height="16" fill="#1F1208" />
          <rect x="4" y="0" width="10" height="16" fill="#1F1208" />
          <ellipse cx="0" cy="-50" rx="18" ry="16" fill="#1F1208" />
          <circle cx="-14" cy="-62" r="6" fill="#1F1208" />
          <circle cx="14" cy="-62" r="6" fill="#1F1208" />
          <ellipse cx="0" cy="-44" rx="9" ry="6" fill="#1F1208" />
          <circle cx="-6" cy="-52" r="0.8" fill="#E8845C" opacity="0.6" />
          <circle cx="6" cy="-52" r="0.8" fill="#E8845C" opacity="0.6" />
        </g>

        {/* Lower fog drift */}
        <rect
          x="0"
          y="560"
          width="1920"
          height="36"
          fill="url(#hf-fog1)"
          opacity="0.7"
          transform="translate(39.42309716869401 0)"
        />

        {/* Film grain */}
        <rect
          width="1920"
          height="800"
          filter="url(#hf-grain)"
          opacity="0.3"
          style={{ mixBlendMode: "multiply" }}
        />
      </svg>
    </div>
  );
}
