import { SEASONS, PaperGrain } from "./botanical";

export function BotanicalFooterDivider({ className }: { className?: string }) {
  // Always summer palette per design spec — footer reads "warm" year-round
  const c = SEASONS.summer;
  return (
    <svg
      viewBox="0 0 1920 140"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      style={{ display: "block", width: "100%", height: "100%" }}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <PaperGrain id="b-fd" />
      </defs>
      <rect width="1920" height="140" fill={c.paper} />
      <circle
        cx="1600"
        cy="50"
        r="22"
        fill="none"
        stroke={c.ink}
        strokeWidth="1.2"
      />
      <g stroke={c.ink} strokeWidth="0.6" opacity="0.55">
        {Array.from({ length: 18 }).map((_, i) => {
          const a = (i / 18) * Math.PI * 2;
          return (
            <line
              key={i}
              x1={1600 + Math.cos(a) * 26}
              y1={50 + Math.sin(a) * 26}
              x2={1600 + Math.cos(a) * 36}
              y2={50 + Math.sin(a) * 36}
            />
          );
        })}
      </g>
      <path
        d="M 0 80 Q 240 55 480 70 Q 720 85 960 55 Q 1200 25 1440 70 Q 1680 115 1920 80 L 1920 140 L 0 140 Z"
        fill={c.wash}
        opacity="0.6"
      />
      <path
        d="M 0 80 Q 240 55 480 70 Q 720 85 960 55 Q 1200 25 1440 70 Q 1680 115 1920 80"
        fill="none"
        stroke={c.ink}
        strokeWidth="1.4"
      />
      <path
        d="M 0 100 Q 200 85 400 95 Q 600 105 800 85 Q 1040 65 1240 95 Q 1480 125 1680 100 L 1920 95"
        fill="none"
        stroke={c.ink}
        strokeWidth="1.5"
      />
      <g stroke={c.ink} strokeWidth="0.9" fill="none">
        {Array.from({ length: 50 }).map((_, i) => {
          const x = i * 40 + (i % 2) * 8;
          const y = 95 + Math.sin(i * 1.4) * 4;
          const h = 8 + (i % 3) * 2;
          return (
            <polygon
              key={i}
              points={`${x},${y - h} ${x - h * 0.4},${y} ${x + h * 0.4},${y}`}
            />
          );
        })}
      </g>
      <path
        d="M 0 120 Q 240 110 480 116 Q 720 122 960 110 Q 1200 100 1440 115 Q 1680 130 1920 118 L 1920 140 L 0 140 Z"
        fill={c.ink}
      />
      <rect
        width="1920"
        height="140"
        filter="url(#b-fd-paper)"
        opacity="0.4"
        style={{ mixBlendMode: "multiply" }}
      />
    </svg>
  );
}
