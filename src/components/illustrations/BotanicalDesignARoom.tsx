import { SEASONS, getCurrentSeason, PaperGrain, Sprig } from "./botanical";
import type { Season } from "./botanical";

type Props = { season?: Season; className?: string };

export function BotanicalDesignARoom({ season, className }: Props) {
  const s = season ?? getCurrentSeason();
  const c = SEASONS[s];
  return (
    <svg
      viewBox="0 0 800 600"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block", width: "100%", height: "100%" }}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <PaperGrain id={`b-dr-${s}`} />
      </defs>
      <rect width="800" height="600" fill={c.paper} />
      <line x1="0" y1="450" x2="800" y2="450" stroke={c.ink} strokeWidth="1.5" />
      <g transform="translate(120 80)" stroke={c.ink} strokeWidth="2.5" fill="none">
        <rect width="400" height="280" fill={c.wash} opacity="0.5" />
        <rect width="400" height="280" />
        <path
          d="M 0 160 Q 80 130 160 145 Q 240 160 320 130 Q 380 110 400 125 L 400 280 L 0 280 Z"
          fill={c.ink}
          opacity="0.75"
        />
        <line x1="200" y1="0" x2="200" y2="280" />
        <line x1="0" y1="140" x2="400" y2="140" />
        <circle cx="320" cy="80" r="14" fill={c.accent2} />
      </g>
      <ellipse
        cx="400"
        cy="500"
        rx="320"
        ry="40"
        fill={c.wash}
        opacity="0.6"
        stroke={c.ink}
        strokeWidth="1.5"
      />
      <ellipse
        cx="400"
        cy="500"
        rx="280"
        ry="32"
        fill="none"
        stroke={c.ink}
        strokeWidth="1"
        strokeDasharray="4 6"
      />
      <g transform="translate(220 380)" stroke={c.ink} strokeWidth="1.6" fill="none">
        <rect x="0" y="20" width="360" height="80" rx="6" fill={c.accent} opacity="0.6" />
        <rect x="0" y="20" width="360" height="80" rx="6" />
        <rect x="10" y="30" width="110" height="40" rx="4" />
        <rect x="125" y="30" width="110" height="40" rx="4" />
        <rect x="240" y="30" width="110" height="40" rx="4" />
        <ellipse cx="40" cy="22" rx="22" ry="10" fill={c.paper} />
        <ellipse cx="320" cy="22" rx="22" ry="10" fill={c.accent2} />
        <rect x="0" y="100" width="10" height="14" fill={c.ink} />
        <rect x="350" y="100" width="10" height="14" fill={c.ink} />
      </g>
      <g transform="translate(660 360)" stroke={c.ink} strokeWidth="1.4" fill="none">
        <rect x="0" y="80" width="44" height="50" fill={c.ink} />
        <ellipse cx="22" cy="50" rx="32" ry="50" fill={c.leaf} opacity="0.85" />
        <ellipse cx="22" cy="50" rx="32" ry="50" />
        <ellipse
          cx="0"
          cy="40"
          rx="14"
          ry="36"
          transform="rotate(-30 0 40)"
          fill={c.leaf}
          opacity="0.85"
        />
        <ellipse
          cx="44"
          cy="40"
          rx="14"
          ry="36"
          transform="rotate(30 44 40)"
          fill={c.leaf}
          opacity="0.85"
        />
      </g>
      <g transform="translate(330 470)" stroke={c.ink} strokeWidth="1.4" fill={c.ink}>
        <rect width="140" height="10" />
        <rect x="6" y="10" width="6" height="20" />
        <rect x="128" y="10" width="6" height="20" />
        <rect x="60" y="-22" width="20" height="22" fill={c.accent2} />
        <line x1="70" y1="-22" x2="70" y2="-44" strokeWidth="1.5" />
        <circle cx="70" cy="-46" r="5" fill={c.bloom} />
      </g>
      <Sprig x={60} y={560} scale={0.85} rotation={-10} season={s} />
      <rect
        width="800"
        height="600"
        filter={`url(#b-dr-${s}-paper)`}
        opacity="0.5"
        style={{ mixBlendMode: "multiply" }}
      />
    </svg>
  );
}
