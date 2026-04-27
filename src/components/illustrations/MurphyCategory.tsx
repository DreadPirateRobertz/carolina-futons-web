import { SEASONS, getCurrentSeason, PaperGrain, Sprig } from "./botanical";
import type { Season } from "./botanical";

type Props = { season?: Season; className?: string };

export function MurphyCategory({ season, className }: Props) {
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
        <PaperGrain id={`b-mc-${s}`} />
      </defs>
      <rect width="800" height="600" fill={c.paper} />
      <g stroke={c.ink} strokeWidth="0.5" opacity="0.18">
        {[120, 160, 200, 240].map((y) => (
          <line key={y} x1="0" y1={y} x2="800" y2={y} />
        ))}
      </g>
      <line x1="0" y1="490" x2="800" y2="490" stroke={c.ink} strokeWidth="1.5" />
      <g stroke={c.ink} strokeWidth="0.8" opacity="0.4">
        {[510, 540, 560, 580].map((y) => (
          <line key={y} x1="0" y1={y} x2="800" y2={y} />
        ))}
      </g>
      <g transform="translate(80 80)" fill="none" stroke={c.ink} strokeWidth="2">
        <rect width="120" height="100" fill={c.wash} opacity="0.5" />
        <rect width="120" height="100" />
        <path
          d="M 0 60 Q 30 45 60 55 Q 90 65 120 50 L 120 100 L 0 100 Z"
          fill={c.ink}
          opacity="0.85"
        />
      </g>
      <g transform="translate(280 60)" fill="none" stroke={c.ink} strokeWidth="1.6">
        <rect width="240" height="430" fill={c.wash} opacity="0.4" />
        <rect width="240" height="430" />
        <rect x="14" y="14" width="212" height="402" />
        <rect x="30" y="40" width="180" height="340" rx="4" fill={c.paper} />
        {[80, 140, 200, 260, 320].map((y) => (
          <g key={y}>
            <circle cx="70" cy={y} r="2" fill={c.ink} />
            <circle cx="120" cy={y} r="2" fill={c.ink} />
            <circle cx="170" cy={y} r="2" fill={c.ink} />
          </g>
        ))}
        <rect x="55" y="50" width="130" height="34" rx="4" fill={c.accent} opacity="0.6" />
        <rect x="-30" y="0" width="30" height="430" />
        <rect x="240" y="0" width="30" height="430" />
        <circle cx="-15" cy="215" r="4" fill={c.accent2} stroke={c.ink} strokeWidth="1" />
        <circle cx="255" cy="215" r="4" fill={c.accent2} stroke={c.ink} strokeWidth="1" />
        <line x1="-20" y1="-12" x2="260" y2="-12" strokeWidth="3" />
      </g>
      <g transform="translate(580 350)" fill="none" stroke={c.ink} strokeWidth="1.4">
        <rect x="0" y="80" width="80" height="60" fill={c.wash} opacity="0.5" />
        <rect x="0" y="80" width="80" height="60" />
        <rect x="32" y="50" width="16" height="30" fill={c.ink} />
        <path d="M 20 50 L 28 14 L 52 14 L 60 50 Z" fill={c.accent2} />
        <ellipse cx="40" cy="30" rx="80" ry="40" fill={c.wash} opacity="0.3" stroke="none" />
      </g>
      <Sprig x={60} y={560} scale={0.8} rotation={-10} season={s} />
      <rect
        width="800"
        height="600"
        filter={`url(#b-mc-${s}-paper)`}
        opacity="0.5"
        style={{ mixBlendMode: "multiply" }}
      />
    </svg>
  );
}
