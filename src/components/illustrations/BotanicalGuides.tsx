import { SEASONS, getCurrentSeason, PaperGrain, Sprig } from "./botanical";
import type { Season } from "./botanical";

type Props = { season?: Season; className?: string };

export function BotanicalGuides({ season, className }: Props) {
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
        <PaperGrain id={`b-gu-${s}`} />
      </defs>
      <rect width="800" height="600" fill={c.paper} />
      <circle cx="640" cy="120" r="32" fill="none" stroke={c.ink} strokeWidth="1.2" />
      <path
        d="M 0 300 Q 150 270 300 285 Q 450 300 600 265 Q 750 235 800 260 L 800 600 L 0 600 Z"
        fill={c.wash}
        opacity="0.5"
      />
      <path
        d="M 0 300 Q 150 270 300 285 Q 450 300 600 265 Q 750 235 800 260"
        fill="none"
        stroke={c.ink}
        strokeWidth="1.2"
      />
      <g transform="translate(120 240)" stroke={c.ink} strokeWidth="1.8" fill="none">
        <ellipse
          cx="280"
          cy="290"
          rx="280"
          ry="20"
          fill={c.ink}
          opacity="0.18"
          stroke="none"
        />
        <path d="M 0 20 L 270 0 L 270 270 L 0 290 Z" fill={c.paper} />
        <path d="M 290 0 L 560 20 L 560 290 L 290 270 Z" fill={c.paper} />
        <path d="M 270 0 L 290 0 L 290 270 L 270 290 Z" fill={c.ink} />
        <g strokeWidth="1.5" opacity="0.7" strokeLinecap="round">
          <line x1="20" y1="40" x2="220" y2="34" />
          <line x1="20" y1="56" x2="240" y2="50" />
          <line x1="20" y1="72" x2="200" y2="66" />
          <line x1="20" y1="88" x2="230" y2="82" />
          <line x1="20" y1="120" x2="180" y2="114" />
        </g>
        <g transform="translate(40 150)">
          <rect width="180" height="100" fill={c.wash} opacity="0.6" />
          <rect width="180" height="100" />
          <path
            d="M 0 60 Q 50 40 100 50 Q 150 60 180 40 L 180 100 L 0 100 Z"
            fill={c.ink}
            opacity="0.85"
            stroke="none"
          />
          <circle cx="140" cy="20" r="10" fill={c.accent2} />
        </g>
        <g transform="translate(310 36)">
          <rect x="20" y="80" width="220" height="36" fill={c.accent2} opacity="0.6" />
          <rect x="20" y="80" width="220" height="36" />
          <rect x="14" y="116" width="232" height="10" fill={c.ink} />
          <rect x="20" y="126" width="6" height="20" fill={c.ink} />
          <rect x="234" y="126" width="6" height="20" fill={c.ink} />
          <line x1="40" y1="60" x2="60" y2="80" strokeWidth="1.2" />
          <circle cx="40" cy="60" r="4" fill={c.accent2} />
          <line x1="200" y1="60" x2="180" y2="80" strokeWidth="1.2" />
          <circle cx="200" cy="60" r="4" fill={c.accent2} />
          <line x1="220" y1="160" x2="180" y2="140" strokeWidth="1.2" />
          <circle cx="220" cy="160" r="4" fill={c.accent2} />
          <line x1="20" y1="20" x2="160" y2="20" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="20" y1="36" x2="220" y2="36" strokeWidth="1.2" opacity="0.5" />
        </g>
      </g>
      <Sprig x={700} y={540} scale={0.85} rotation={14} season={s} />
      <rect
        width="800"
        height="600"
        filter={`url(#b-gu-${s}-paper)`}
        opacity="0.5"
        style={{ mixBlendMode: "multiply" }}
      />
    </svg>
  );
}
