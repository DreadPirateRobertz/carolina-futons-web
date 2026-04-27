import { SEASONS, getCurrentSeason, PaperGrain, Sprig } from "./botanical";
import type { Season } from "./botanical";

type Props = { season?: Season; className?: string; instanceKey?: string };

export function PlatformCategory({ season, className }: Props) {
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
        <PaperGrain id={`b-pc-${s}`} />
      </defs>
      <rect width="800" height="600" fill={c.paper} />
      <circle cx="200" cy="140" r="36" fill="none" stroke={c.ink} strokeWidth="1.2" />
      <path
        d="M 0 280 Q 150 250 300 270 Q 450 290 600 255 Q 750 225 800 245 L 800 600 L 0 600 Z"
        fill={c.wash}
        opacity="0.5"
      />
      <path
        d="M 0 280 Q 150 250 300 270 Q 450 290 600 255 Q 750 225 800 245"
        fill="none"
        stroke={c.ink}
        strokeWidth="1.2"
      />
      <path
        d="M 0 330 Q 200 295 400 315 Q 600 335 800 300"
        fill="none"
        stroke={c.ink}
        strokeWidth="1.3"
      />
      <path
        d="M 0 380 Q 200 350 400 370 Q 600 390 800 360"
        fill="none"
        stroke={c.ink}
        strokeWidth="1.4"
      />
      <line x1="0" y1="430" x2="800" y2="430" stroke={c.ink} strokeWidth="1.5" />
      <g stroke={c.ink} strokeWidth="1.1" fill="none">
        {[60, 720].map((x, i) => (
          <g key={i} transform={`translate(${x} 430)`}>
            <polygon points="0,-66 -22,0 22,0" />
            <polygon points="0,-48 -18,-14 18,-14" />
            <polygon points="0,-30 -14,-4 14,-4" />
          </g>
        ))}
      </g>
      <g transform="translate(140 350)" stroke={c.ink} strokeWidth="1.5" fill="none">
        <rect x="20" y="20" width="480" height="50" rx="4" fill={c.paper} />
        <rect x="20" y="50" width="480" height="20" fill={c.wash} opacity="0.5" />
        <rect x="40" y="0" width="80" height="28" rx="4" fill={c.accent2} />
        <rect x="130" y="0" width="80" height="28" rx="4" fill={c.paper} />
        <rect x="0" y="70" width="520" height="22" fill={c.ink} />
        <polygon points="6,92 18,92 14,140 8,140" fill={c.ink} />
        <polygon points="502,92 514,92 510,140 506,140" fill={c.ink} />
        <rect x="0" y="-58" width="520" height="14" fill={c.ink} />
        {[20, 80, 140, 200, 260, 320, 380, 440, 500].map((x) => (
          <rect key={x} x={x} y="-44" width="6" height="48" fill={c.ink} />
        ))}
      </g>
      <Sprig x={740} y={550} scale={0.9} rotation={12} season={s} />
      <rect
        width="800"
        height="600"
        filter={`url(#b-pc-${s}-paper)`}
        opacity="0.5"
        style={{ mixBlendMode: "multiply" }}
      />
    </svg>
  );
}
