export type Season = "spring" | "summer" | "fall" | "winter";

export type SeasonPalette = {
  paper: string;
  ink: string;
  accent: string;
  accent2: string;
  wash: string;
  leaf: string;
  bloom: string;
};

export const SEASONS: Record<Season, SeasonPalette> = {
  spring: {
    paper: "#FAF2DE",
    ink: "#3A2518",
    accent: "#5B8FA8",
    accent2: "#E8845C",
    wash: "#D4E5D0",
    leaf: "#6B8A4A",
    bloom: "#E8A4B8",
  },
  summer: {
    paper: "#F5E8C8",
    ink: "#3A2518",
    accent: "#5B8FA8",
    accent2: "#E8845C",
    wash: "#F0C87A",
    leaf: "#3A5A2A",
    bloom: "#E8845C",
  },
  fall: {
    paper: "#F0DEB5",
    ink: "#3A2518",
    accent: "#B8523A",
    accent2: "#E8845C",
    wash: "#E8A862",
    leaf: "#B8523A",
    bloom: "#D87A3A",
  },
  winter: {
    paper: "#E8E0D2",
    ink: "#1F1828",
    accent: "#5B8FA8",
    accent2: "#8BB5C9",
    wash: "#C8D8E0",
    leaf: "#6B7A82",
    bloom: "#FAF7F2",
  },
};

export function getCurrentSeason(): Season {
  const m = new Date().getMonth();
  if (m >= 2 && m <= 4) return "spring";
  if (m >= 5 && m <= 7) return "summer";
  if (m >= 8 && m <= 10) return "fall";
  return "winter";
}

export function PaperGrain({ id }: { id: string }) {
  return (
    <>
      <filter id={`${id}-paper`} x="0" y="0" width="100%" height="100%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.85"
          numOctaves={3}
          seed={9}
        />
        <feColorMatrix values="0 0 0 0 0.18  0 0 0 0 0.10  0 0 0 0 0.06  0 0 0 0.18 0" />
      </filter>
      <filter id={`${id}-ink`} x="-2%" y="-2%" width="104%" height="104%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.04"
          numOctaves={2}
          seed={2}
        />
        <feDisplacementMap in="SourceGraphic" scale={1.2} />
      </filter>
    </>
  );
}

type SprigProps = {
  x: number;
  y: number;
  scale?: number;
  rotation?: number;
  season: Season;
};

export function Sprig({ x, y, scale = 1, rotation = 0, season }: SprigProps) {
  const c = SEASONS[season];
  return (
    <g
      transform={`translate(${x} ${y}) rotate(${rotation}) scale(${scale})`}
    >
      {season === "spring" && (
        <>
          <path
            d="M 0 0 Q 4 -20 12 -38 Q 18 -58 14 -78"
            fill="none"
            stroke={c.ink}
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          {([-12, -26, -44, -62] as const).map((yy, i) => (
            <g
              key={i}
              transform={`translate(${[2, 8, 14, 12][i]} ${yy})`}
            >
              <ellipse
                cx="-8"
                cy="0"
                rx="10"
                ry="4"
                fill="none"
                stroke={c.ink}
                strokeWidth="1"
                transform="rotate(-30)"
              />
              <ellipse
                cx="8"
                cy="0"
                rx="10"
                ry="4"
                fill="none"
                stroke={c.ink}
                strokeWidth="1"
                transform="rotate(30)"
              />
            </g>
          ))}
          <circle
            cx="14"
            cy="-78"
            r="6"
            fill="none"
            stroke={c.ink}
            strokeWidth="1.2"
          />
          <circle cx="14" cy="-78" r="2" fill={c.bloom} />
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse
              key={a}
              cx="14"
              cy="-78"
              rx="3"
              ry="6"
              fill="none"
              stroke={c.ink}
              strokeWidth="1"
              transform={`rotate(${a} 14 -78)`}
            />
          ))}
        </>
      )}
      {season === "summer" && (
        <>
          <path
            d="M 0 0 Q 6 -22 14 -42 Q 22 -62 18 -84"
            fill="none"
            stroke={c.ink}
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          {([-14, -30, -48, -66] as const).map((yy, i) => (
            <g
              key={i}
              transform={`translate(${[4, 10, 18, 16][i]} ${yy})`}
            >
              <path
                d="M 0 0 Q -10 -4 -16 -10 Q -10 0 0 0"
                fill="none"
                stroke={c.ink}
                strokeWidth="1"
              />
              <path
                d="M 0 0 Q 10 -4 16 -10 Q 10 0 0 0"
                fill="none"
                stroke={c.ink}
                strokeWidth="1"
              />
            </g>
          ))}
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${18 + i * 4} ${-84 - i * 4})`}>
              {[0, 60, 120, 180, 240, 300].map((a) => (
                <ellipse
                  key={a}
                  rx="2"
                  ry="4"
                  fill={c.bloom}
                  stroke={c.ink}
                  strokeWidth="0.8"
                  transform={`rotate(${a}) translate(0 -3)`}
                />
              ))}
            </g>
          ))}
        </>
      )}
      {season === "fall" && (
        <>
          <path
            d="M 0 0 Q 5 -22 10 -44 Q 14 -64 8 -86"
            fill="none"
            stroke={c.ink}
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          {([-16, -36, -56, -76] as const).map((yy, i) => (
            <g
              key={i}
              transform={`translate(${[3, 6, 4, 2][i]} ${yy})`}
            >
              <path
                d="M 0 0 L -12 -6 L -16 -14 L -10 -8 L -6 -16 L -2 -8 L 4 -14 L 0 -6 Z"
                fill={i % 2 ? c.accent : c.bloom}
                stroke={c.ink}
                strokeWidth="1"
                opacity="0.85"
                transform="rotate(-20)"
              />
              <path
                d="M 0 0 L 12 -6 L 16 -14 L 10 -8 L 6 -16 L 2 -8 L -4 -14 L 0 -6 Z"
                fill={i % 2 ? c.bloom : c.accent}
                stroke={c.ink}
                strokeWidth="1"
                opacity="0.85"
                transform="rotate(20)"
              />
            </g>
          ))}
        </>
      )}
      {season === "winter" && (
        <>
          <path
            d="M 0 0 Q 4 -20 8 -42 Q 12 -64 6 -86"
            fill="none"
            stroke={c.ink}
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          {([-8, -22, -36, -52, -68, -82] as const).map((yy, i) => (
            <g
              key={i}
              transform={`translate(${[1, 3, 5, 7, 9, 7][i]} ${yy})`}
            >
              {Array.from({ length: 7 }).map((_, j) => {
                const a = -90 + j * 30;
                return (
                  <line
                    key={j}
                    x1="0"
                    y1="0"
                    x2={Math.cos((a * Math.PI) / 180) * 10}
                    y2={Math.sin((a * Math.PI) / 180) * 10}
                    stroke={c.ink}
                    strokeWidth="0.8"
                  />
                );
              })}
            </g>
          ))}
          <g transform="translate(8 -86)">
            {[0, 60, 120].map((a) => (
              <line
                key={a}
                x1="-6"
                y1="0"
                x2="6"
                y2="0"
                stroke={c.ink}
                strokeWidth="0.8"
                transform={`rotate(${a})`}
              />
            ))}
            <circle r="1.5" fill={c.bloom} stroke={c.ink} strokeWidth="0.6" />
          </g>
        </>
      )}
    </g>
  );
}
