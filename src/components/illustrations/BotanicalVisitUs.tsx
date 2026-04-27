import { SEASONS, getCurrentSeason, PaperGrain, Sprig } from "./botanical";
import type { Season } from "./botanical";

type Props = { season?: Season; className?: string };

export function BotanicalVisitUs({ season, className }: Props) {
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
        <PaperGrain id={`b-vu-${s}`} />
      </defs>
      <rect width="800" height="600" fill={c.paper} />
      <circle cx="180" cy="130" r="34" fill="none" stroke={c.ink} strokeWidth="1.2" />
      <path
        d="M 0 240 Q 150 210 300 225 Q 450 240 600 205 Q 750 175 800 195 L 800 360 L 0 360 Z"
        fill={c.wash}
        opacity="0.5"
      />
      <path
        d="M 0 240 Q 150 210 300 225 Q 450 240 600 205 Q 750 175 800 195"
        fill="none"
        stroke={c.ink}
        strokeWidth="1.2"
      />
      <path
        d="M 0 290 Q 200 250 400 275 Q 600 300 800 265"
        fill="none"
        stroke={c.ink}
        strokeWidth="1.4"
      />
      <line x1="0" y1="500" x2="800" y2="500" stroke={c.ink} strokeWidth="1.5" />
      <rect x="0" y="540" width="800" height="60" fill={c.ink} opacity="0.85" />
      <line
        x1="0"
        y1="568"
        x2="800"
        y2="568"
        stroke={c.paper}
        strokeWidth="1.5"
        strokeDasharray="20 14"
      />
      <g transform="translate(160 250)" stroke={c.ink} strokeWidth="1.6" fill="none">
        <rect x="0" y="0" width="480" height="250" fill={c.paper} />
        <polygon points="-20,0 500,0 470,-30 10,-30" fill={c.ink} />
        <rect x="-20" y="-38" width="520" height="10" fill={c.ink} />
        <polygon points="60,80 420,80 410,110 70,110" fill={c.accent2} opacity="0.7" />
        <polygon points="60,80 420,80 410,110 70,110" />
        {[120, 180, 240, 300, 360].map((x) => (
          <line key={x} x1={x} y1="80" x2={x - 6} y2="110" strokeWidth="2" />
        ))}
        <rect x="80" y="20" width="320" height="50" fill={c.ink} />
        <text
          x="240"
          y="55"
          textAnchor="middle"
          fontFamily="Playfair Display, Georgia, serif"
          fontSize="26"
          fontWeight="700"
          fill={c.paper}
          stroke="none"
        >
          Carolina Futons
        </text>
        <rect x="40" y="120" width="160" height="120" fill={c.wash} opacity="0.5" />
        <rect x="40" y="120" width="160" height="120" />
        <line x1="120" y1="120" x2="120" y2="240" strokeWidth="1.2" />
        <line x1="40" y1="180" x2="200" y2="180" strokeWidth="1.2" />
        <rect x="60" y="190" width="120" height="30" fill={c.accent2} />
        <rect x="220" y="120" width="80" height="130" fill={c.ink} />
        <circle cx="288" cy="190" r="3" fill={c.accent2} />
        <rect x="234" y="135" width="52" height="40" fill={c.wash} opacity="0.8" />
        <rect x="234" y="135" width="52" height="40" />
        <rect x="320" y="120" width="120" height="120" fill={c.wash} opacity="0.5" />
        <rect x="320" y="120" width="120" height="120" />
        <line x1="380" y1="120" x2="380" y2="240" strokeWidth="1.2" />
        <line x1="320" y1="180" x2="440" y2="180" strokeWidth="1.2" />
      </g>
      <g transform="translate(80 380)" stroke={c.ink} strokeWidth="1.4" fill={c.leaf}>
        <rect x="-4" y="60" width="8" height="60" fill={c.ink} />
        <circle cx="0" cy="40" r="46" opacity="0.85" />
        <circle cx="-26" cy="20" r="28" opacity="0.85" />
        <circle cx="26" cy="22" r="28" opacity="0.85" />
        <circle cx="0" cy="40" r="46" fill="none" />
      </g>
      <Sprig x={730} y={490} scale={0.8} rotation={14} season={s} />
      <rect
        width="800"
        height="600"
        filter={`url(#b-vu-${s}-paper)`}
        opacity="0.5"
        style={{ mixBlendMode: "multiply" }}
      />
    </svg>
  );
}
