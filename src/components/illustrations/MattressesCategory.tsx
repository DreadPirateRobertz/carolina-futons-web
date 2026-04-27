import { SEASONS, getCurrentSeason, PaperGrain, Sprig } from "./botanical";
import type { Season } from "./botanical";

type Props = { season?: Season; className?: string };

export function MattressesCategory({ season, className }: Props) {
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
        <PaperGrain id={`b-mat-${s}`} />
      </defs>
      <rect width="800" height="600" fill={c.paper} />
      <circle cx="400" cy="240" r="60" fill="none" stroke={c.ink} strokeWidth="1.4" />
      <g stroke={c.ink} strokeWidth="0.7" opacity="0.5">
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2;
          return (
            <line
              key={i}
              x1={400 + Math.cos(a) * 68}
              y1={240 + Math.sin(a) * 68}
              x2={400 + Math.cos(a) * 84}
              y2={240 + Math.sin(a) * 84}
            />
          );
        })}
      </g>
      <path
        d="M 0 320 Q 150 290 300 305 Q 450 320 600 285 Q 750 255 800 280 L 800 600 L 0 600 Z"
        fill={c.wash}
        opacity="0.5"
      />
      <path
        d="M 0 320 Q 150 290 300 305 Q 450 320 600 285 Q 750 255 800 280"
        fill="none"
        stroke={c.ink}
        strokeWidth="1.2"
      />
      <path
        d="M 0 380 Q 200 340 400 365 Q 600 390 800 350"
        fill="none"
        stroke={c.ink}
        strokeWidth="1.4"
      />
      <line x1="0" y1="450" x2="800" y2="450" stroke={c.ink} strokeWidth="1.5" />
      <g transform="translate(220 280)" stroke={c.ink} strokeWidth="1.5" fill="none">
        <rect x="20" y="0" width="320" height="44" rx="6" fill={c.paper} />
        <line x1="40" y1="22" x2="320" y2="22" strokeWidth="0.8" opacity="0.6" />
        {[60, 120, 180, 240, 300].map((x) => (
          <circle key={x} cx={x} cy="22" r="2" fill={c.ink} />
        ))}
        <rect x="10" y="50" width="340" height="50" rx="6" fill={c.wash} opacity="0.5" />
        <rect x="10" y="50" width="340" height="50" rx="6" />
        <line x1="30" y1="76" x2="340" y2="76" strokeWidth="0.8" opacity="0.6" />
        {[60, 120, 180, 240, 300].map((x) => (
          <circle key={x} cx={x} cy="76" r="2" fill={c.ink} />
        ))}
        <rect x="0" y="106" width="360" height="56" rx="6" fill={c.paper} />
        <line x1="20" y1="135" x2="350" y2="135" strokeWidth="0.8" opacity="0.6" />
        {[60, 120, 180, 240, 300].map((x) => (
          <circle key={x} cx={x} cy="135" r="2" fill={c.ink} />
        ))}
        <g transform="translate(280 -34)">
          <rect width="64" height="28" rx="4" fill={c.accent2} />
          <rect width="64" height="28" rx="4" />
          <text
            x="32"
            y="19"
            textAnchor="middle"
            fontSize="14"
            fontWeight="700"
            fill={c.paper}
            fontFamily="Source Sans 3, sans-serif"
            stroke="none"
          >
            USA
          </text>
        </g>
      </g>
      <Sprig x={60} y={540} scale={0.9} rotation={-10} season={s} />
      <Sprig x={740} y={540} scale={0.9} rotation={14} season={s} />
      <rect
        width="800"
        height="600"
        filter={`url(#b-mat-${s}-paper)`}
        opacity="0.5"
        style={{ mixBlendMode: "multiply" }}
      />
    </svg>
  );
}
