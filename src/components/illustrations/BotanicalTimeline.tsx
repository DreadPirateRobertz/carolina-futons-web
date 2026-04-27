import { SEASONS, getCurrentSeason, PaperGrain, Sprig } from "./botanical";
import type { Season } from "./botanical";

type Props = { season?: Season; className?: string };

const WAYPOINTS = [
  { x: 200, y: 320, year: "1991", label: "Opened on Locust" },
  { x: 720, y: 280, year: "2005", label: "Showroom expansion" },
  { x: 1240, y: 300, year: "2015", label: "Hardwood-only commitment" },
  { x: 1720, y: 260, year: "2026", label: "Today — 35 years" },
];

const PATH = `M ${WAYPOINTS[0].x} ${WAYPOINTS[0].y} Q 460 360 ${WAYPOINTS[1].x} ${WAYPOINTS[1].y} Q 980 240 ${WAYPOINTS[2].x} ${WAYPOINTS[2].y} Q 1480 340 ${WAYPOINTS[3].x} ${WAYPOINTS[3].y}`;

export function BotanicalTimeline({ season, className }: Props) {
  const s = season ?? getCurrentSeason();
  const c = SEASONS[s];
  const truckX = (WAYPOINTS[2].x + WAYPOINTS[3].x) / 2 - 30;
  const truckY = (WAYPOINTS[2].y + WAYPOINTS[3].y) / 2 + 8;
  return (
    <svg
      viewBox="0 0 1920 500"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block", width: "100%", height: "100%" }}
      className={className}
      role="img"
      data-slot="blue-ridge-timeline"
      aria-label="Carolina Futons milestones: opened 1991, showroom expansion 2005, hardwood-only commitment 2015, today 35 years"
    >
      <defs>
        <PaperGrain id={`b-tl-${s}`} />
      </defs>
      <rect width="1920" height="500" fill={c.paper} />
      <path
        d="M 0 220 Q 240 195 480 210 Q 720 225 960 195 Q 1200 165 1440 210 Q 1680 245 1920 215 L 1920 500 L 0 500 Z"
        fill={c.wash}
        opacity="0.5"
      />
      <path
        d="M 0 220 Q 240 195 480 210 Q 720 225 960 195 Q 1200 165 1440 210 Q 1680 245 1920 215"
        fill="none"
        stroke={c.ink}
        strokeWidth="1.2"
      />
      <path
        d="M 0 270 Q 200 240 400 255 Q 600 270 800 235 Q 1040 200 1240 260 Q 1480 320 1680 275 L 1920 265"
        fill="none"
        stroke={c.ink}
        strokeWidth="1.3"
      />
      <path
        d="M 0 340 Q 240 305 480 320 Q 720 335 960 305 Q 1200 280 1440 320 Q 1680 360 1920 325"
        fill="none"
        stroke={c.ink}
        strokeWidth="1.4"
      />
      <g opacity="0.25">
        {Array.from({ length: 60 }).map((_, i) => (
          <line
            key={i}
            x1={i * 32}
            y1="340"
            x2={i * 32 + 24}
            y2="500"
            stroke={c.ink}
            strokeWidth="0.5"
          />
        ))}
      </g>
      <path
        d={PATH}
        fill="none"
        stroke={c.ink}
        strokeWidth="2"
        strokeDasharray="2 9"
        strokeLinecap="round"
      />
      <g
        transform={`translate(${truckX} ${truckY}) rotate(-6)`}
        fill="none"
        stroke={c.ink}
        strokeWidth="1.4"
      >
        <rect x="-44" y="-22" width="52" height="22" fill={c.paper} />
        <rect x="8" y="-18" width="20" height="18" fill={c.accent2} />
        <rect x="11" y="-15" width="14" height="9" fill={c.wash} />
        <circle cx="-32" cy="2" r="4" fill={c.ink} />
        <circle cx="-8" cy="2" r="4" fill={c.ink} />
        <circle cx="20" cy="2" r="4" fill={c.ink} />
      </g>
      <g stroke={c.ink} strokeWidth="1" fill="none">
        {[100, 380, 580, 880, 1080, 1380, 1580, 1820].map((x, i) => {
          const y = 320 + Math.sin(i * 1.5) * 12;
          const h = 18;
          return (
            <g key={i} transform={`translate(${x} ${y})`}>
              <polygon points={`0,-${h} -${h * 0.3},0 ${h * 0.3},0`} />
              <polygon
                points={`-12,-${h * 0.7} -${12 + h * 0.3},${h * 0.3} ${-12 + h * 0.3},${h * 0.3}`}
              />
              <polygon
                points={`12,-${h * 0.6} ${12 - h * 0.3},${h * 0.3} ${12 + h * 0.3},${h * 0.3}`}
              />
            </g>
          );
        })}
      </g>
      <path
        d="M 0 420 Q 240 395 480 410 Q 720 425 960 395 Q 1200 370 1440 410 Q 1680 445 1920 420 L 1920 500 L 0 500 Z"
        fill={c.ink}
      />
      {WAYPOINTS.map((w, i) => (
        <g key={i} transform={`translate(${w.x} ${w.y})`}>
          <ellipse cx="0" cy="6" rx="14" ry="3" fill={c.ink} opacity="0.18" />
          <path
            d="M 0 -50 C -14 -50 -14 -28 0 -10 C 14 -28 14 -50 0 -50 Z"
            fill={c.accent}
            stroke={c.ink}
            strokeWidth="1.4"
          />
          <line x1="0" y1="-46" x2="0" y2="-14" stroke={c.ink} strokeWidth="1" />
          <circle
            cx="0"
            cy="-32"
            r="4"
            fill={c.paper}
            stroke={c.ink}
            strokeWidth="1"
          />
          <rect
            x="-32"
            y="-94"
            width="64"
            height="30"
            rx="3"
            fill={c.paper}
            stroke={c.ink}
            strokeWidth="1.4"
          />
          <text
            x="0"
            y="-74"
            textAnchor="middle"
            fontFamily="Playfair Display, Georgia, serif"
            fontSize="16"
            fontWeight="700"
            fill={c.ink}
          >
            {w.year}
          </text>
          <line
            x1="-20"
            y1="-60"
            x2="20"
            y2="-60"
            stroke={c.ink}
            strokeWidth="0.8"
          />
          <text
            x="0"
            y="38"
            textAnchor="middle"
            fontFamily="Source Sans 3, sans-serif"
            fontSize="13"
            fontWeight="600"
            fill={c.ink}
          >
            {w.label}
          </text>
        </g>
      ))}
      <Sprig x={80} y={460} scale={1.2} rotation={-12} season={s} />
      <Sprig x={1850} y={460} scale={1.2} rotation={14} season={s} />
      <rect
        width="1920"
        height="500"
        filter={`url(#b-tl-${s}-paper)`}
        opacity="0.5"
        style={{ mixBlendMode: "multiply" }}
      />
    </svg>
  );
}
