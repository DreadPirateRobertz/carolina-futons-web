import { SEASONS, getCurrentSeason, PaperGrain, Sprig } from "./botanical";
import type { Season } from "./botanical";

type Props = { season?: Season; className?: string; instanceKey?: string };

export function FutonsCategory({ season, className }: Props) {
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
        <PaperGrain id={`b-fc-${s}`} />
      </defs>
      <rect width="800" height="600" fill={c.paper} />
      <circle cx="600" cy="170" r="38" fill="none" stroke={c.ink} strokeWidth="1.2" />
      <g stroke={c.ink} strokeWidth="0.7" opacity="0.5">
        {Array.from({ length: 18 }).map((_, i) => {
          const a = (i / 18) * Math.PI * 2;
          return (
            <line
              key={i}
              x1={600 + Math.cos(a) * 44}
              y1={170 + Math.sin(a) * 44}
              x2={600 + Math.cos(a) * 56}
              y2={170 + Math.sin(a) * 56}
            />
          );
        })}
      </g>
      <path
        d="M 0 280 Q 150 250 300 265 Q 450 280 600 245 Q 750 215 800 240 L 800 600 L 0 600 Z"
        fill={c.wash}
        opacity="0.55"
      />
      <path
        d="M 0 280 Q 150 250 300 265 Q 450 280 600 245 Q 750 215 800 240"
        fill="none"
        stroke={c.ink}
        strokeWidth="1.2"
      />
      <path
        d="M 0 320 Q 200 280 400 305 Q 600 330 800 290"
        fill="none"
        stroke={c.ink}
        strokeWidth="1.3"
      />
      <path
        d="M 0 370 Q 200 335 400 360 Q 600 385 800 350"
        fill="none"
        stroke={c.ink}
        strokeWidth="1.4"
      />
      <line x1="0" y1="430" x2="800" y2="430" stroke={c.ink} strokeWidth="1.5" />
      <g stroke={c.ink} strokeWidth="1.1" fill="none">
        {[60, 140, 720].map((x, i) => (
          <g key={i} transform={`translate(${x} 430)`}>
            <polygon points="0,-60 -20,0 20,0" />
            <polygon points="0,-44 -16,-12 16,-12" />
            <polygon points="0,-28 -12,-4 12,-4" />
            <line x1="0" y1="0" x2="0" y2="8" />
          </g>
        ))}
      </g>
      <g transform="translate(180 380)" stroke={c.ink} strokeWidth="1.5" fill="none">
        <rect x="0" y="40" width="440" height="38" rx="6" fill={c.accent2} />
        {[60, 140, 220, 300, 380].map((x) => (
          <circle key={x} cx={x} cy="59" r="3" fill={c.ink} />
        ))}
        <rect x="-10" y="78" width="460" height="10" rx="2" fill={c.ink} />
        <rect x="0" y="88" width="14" height="32" fill={c.ink} />
        <rect x="436" y="88" width="14" height="32" fill={c.ink} />
        <rect x="40" y="22" width="60" height="22" rx="4" fill={c.paper} />
        <rect x="340" y="22" width="60" height="22" rx="4" fill={c.paper} />
        <rect x="20" y="-6" width="400" height="32" rx="4" fill={c.wash} />
        <line
          x1="20"
          y1="10"
          x2="420"
          y2="10"
          strokeDasharray="3 4"
          strokeWidth="0.8"
        />
      </g>
      <Sprig x={60} y={540} scale={1} rotation={-10} season={s} />
      <Sprig x={740} y={540} scale={1} rotation={14} season={s} />
      <rect
        width="800"
        height="600"
        filter={`url(#b-fc-${s}-paper)`}
        opacity="0.5"
        style={{ mixBlendMode: "multiply" }}
      />
    </svg>
  );
}
