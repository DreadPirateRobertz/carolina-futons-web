import { V3_PAL as c } from "./MascotPalette";
import { Bear, Owl, Fox, Deer } from "./MascotCharacters";

const MILESTONES = [
  { x: 200,  y: 280, year: "1991", label: "Opened on Locust",          Character: Bear,  charScale: 0.55, flip: false },
  { x: 720,  y: 260, year: "2005", label: "Showroom expansion",        Character: Owl,   charScale: 0.60, flip: false },
  { x: 1240, y: 275, year: "2015", label: "Hardwood-only commitment",  Character: Fox,   charScale: 0.55, flip: true  },
  { x: 1720, y: 255, year: "2026", label: "Today — 35 years",          Character: Deer,  charScale: 0.55, flip: false },
] as const;

const CURVE_D = `M ${MILESTONES[0].x} ${MILESTONES[0].y} Q 460 340 ${MILESTONES[1].x} ${MILESTONES[1].y} Q 980 220 ${MILESTONES[2].x} ${MILESTONES[2].y} Q 1480 330 ${MILESTONES[3].x} ${MILESTONES[3].y}`;

export function MascotTimeline({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1920 500"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block", width: "100%", height: "100%" }}
      className={className}
      role="img"
      data-slot="mascot-timeline"
      aria-label="Carolina Futons milestones: opened 1991, showroom expansion 2005, hardwood-only commitment 2015, today 35 years"
    >
      {/* Background */}
      <rect width="1920" height="500" fill={c.paper} />

      {/* Subtle ridge wash */}
      <path
        d="M 0 340 Q 480 310 960 325 Q 1440 340 1920 315 L 1920 500 L 0 500 Z"
        fill={c.ridge5}
        opacity="0.35"
      />

      {/* Milestone journey path */}
      <path
        d={CURVE_D}
        fill="none"
        stroke={c.inkSoft}
        strokeWidth="2"
        strokeDasharray="8 6"
        opacity="0.45"
      />

      {/* Milestones */}
      {MILESTONES.map(({ x, y, year, label, Character, charScale, flip }) => (
        <g key={year} transform={`translate(${x} ${y})`}>
          {/* Dot on the path */}
          <circle cy={0} cx={0} r="6" fill={c.bearMuzzle} opacity="0.85" />
          <circle cy={0} cx={0} r="3" fill={c.cream} />

          {/* Character vignette above the dot */}
          <g transform={`translate(0 -80)`}>
            <Character scale={charScale} flip={flip} />
          </g>

          {/* Year label */}
          <text
            y={30}
            textAnchor="middle"
            fontFamily="Playfair Display, serif"
            fontSize="22"
            fontWeight="700"
            fill={c.ink}
          >
            {year}
          </text>

          {/* Event label */}
          <text
            y={52}
            textAnchor="middle"
            fontFamily="Source Sans 3, sans-serif"
            fontSize="15"
            fill={c.inkSoft}
            opacity="0.85"
          >
            {label}
          </text>
        </g>
      ))}
    </svg>
  );
}
