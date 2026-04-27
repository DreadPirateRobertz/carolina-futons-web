import { SEASONS, getCurrentSeason, PaperGrain, Sprig } from "./botanical";
import type { Season } from "./botanical";

type Props = { season?: Season; className?: string };

export function BotanicalReviews({ season, className }: Props) {
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
        <PaperGrain id={`b-rv-${s}`} />
      </defs>
      <rect width="800" height="600" fill={c.paper} />
      <g
        transform="translate(400 320)"
        opacity="0.4"
        stroke={c.ink}
        strokeWidth="0.8"
        fill="none"
      >
        {Array.from({ length: 14 }).map((_, i) => {
          const a = (i / 14) * 180 - 90;
          return (
            <line
              key={i}
              x1="0"
              y1="0"
              x2="0"
              y2="-380"
              transform={`rotate(${a})`}
            />
          );
        })}
      </g>
      <circle cx="400" cy="320" r="60" fill="none" stroke={c.ink} strokeWidth="1.4" />
      <path
        d="M 0 360 Q 150 330 300 345 Q 450 360 600 325 Q 750 295 800 320 L 800 600 L 0 600 Z"
        fill={c.wash}
        opacity="0.55"
      />
      <path
        d="M 0 360 Q 150 330 300 345 Q 450 360 600 325 Q 750 295 800 320"
        fill="none"
        stroke={c.ink}
        strokeWidth="1.2"
      />
      <path
        d="M 0 420 Q 200 380 400 405 Q 600 430 800 395"
        fill="none"
        stroke={c.ink}
        strokeWidth="1.4"
      />
      <path
        d="M 0 480 Q 200 460 400 475 Q 600 490 800 465 L 800 600 L 0 600 Z"
        fill={c.ink}
      />
      <g transform="translate(180 200)">
        <rect x="6" y="8" width="440" height="220" fill={c.ink} opacity="0.18" rx="10" />
        <rect
          width="440"
          height="220"
          fill={c.paper}
          stroke={c.ink}
          strokeWidth="2"
          rx="10"
        />
        <text
          x="40"
          y="100"
          fontFamily="Playfair Display, Georgia, serif"
          fontSize="120"
          fontWeight="700"
          fill={c.accent2}
        >
          &ldquo;
        </text>
        <g transform="translate(40 130)">
          {[0, 1, 2, 3, 4].map((i) => (
            <polygon
              key={i}
              transform={`translate(${i * 32} 0)`}
              points="14,0 17,9 27,10 19,16 22,26 14,21 6,26 9,16 1,10 11,9"
              fill={c.accent2}
              stroke={c.ink}
              strokeWidth="1"
            />
          ))}
        </g>
        <g stroke={c.ink} strokeWidth="2" opacity="0.7" strokeLinecap="round">
          <line x1="40" y1="170" x2="380" y2="170" />
          <line x1="40" y1="186" x2="350" y2="186" />
          <line x1="40" y1="202" x2="280" y2="202" />
        </g>
      </g>
      <Sprig x={80} y={540} scale={0.9} rotation={-10} season={s} />
      <Sprig x={720} y={540} scale={0.9} rotation={14} season={s} />
      <rect
        width="800"
        height="600"
        filter={`url(#b-rv-${s}-paper)`}
        opacity="0.5"
        style={{ mixBlendMode: "multiply" }}
      />
    </svg>
  );
}
