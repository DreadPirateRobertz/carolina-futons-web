import { SEASONS, getCurrentSeason, PaperGrain, Sprig } from "./botanical";
import type { Season } from "./botanical";

type Props = { season?: Season; className?: string };

export function BotanicalMountainSkyline({ season, className }: Props) {
  const s = season ?? getCurrentSeason();
  const c = SEASONS[s];
  return (
    <svg
      viewBox="0 0 1920 600"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      style={{ display: "block", width: "100%", height: "100%" }}
      className={className}
      data-slot="mountain-skyline"
      aria-hidden="true"
    >
      <defs>
        <PaperGrain id={`b-ms-${s}`} />
      </defs>
      <rect width="1920" height="600" fill={c.paper} />
      <circle cx="1380" cy="200" r="120" fill={c.wash} opacity="0.5" />
      <circle
        cx="1380"
        cy="200"
        r="56"
        fill="none"
        stroke={c.ink}
        strokeWidth="1.4"
      />
      <g stroke={c.ink} strokeWidth="0.8" opacity="0.55">
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2;
          return (
            <line
              key={i}
              x1={1380 + Math.cos(a) * 64}
              y1={200 + Math.sin(a) * 64}
              x2={1380 + Math.cos(a) * (86 + (i % 3) * 16)}
              y2={200 + Math.sin(a) * (86 + (i % 3) * 16)}
            />
          );
        })}
      </g>
      <path
        d="M 0 350 Q 240 320 480 335 Q 720 350 960 315 Q 1200 280 1440 320 Q 1680 360 1920 330 L 1920 600 L 0 600 Z"
        fill={c.wash}
        opacity="0.5"
      />
      <path
        d="M 0 420 Q 240 380 480 400 Q 720 420 960 385 Q 1200 350 1440 405 Q 1680 460 1920 420 L 1920 600 L 0 600 Z"
        fill={c.wash}
        opacity="0.6"
      />
      <path
        d="M 0 320 Q 240 295 480 305 Q 720 315 960 285 Q 1200 255 1440 295 Q 1680 335 1920 305"
        fill="none"
        stroke={c.ink}
        strokeWidth="1.2"
      />
      <path
        d="M 0 360 Q 200 325 400 340 Q 600 355 800 320 Q 1040 285 1240 345 Q 1480 405 1680 360 L 1920 350"
        fill="none"
        stroke={c.ink}
        strokeWidth="1.3"
      />
      <path
        d="M 0 400 Q 240 360 480 380 Q 720 400 960 360 Q 1200 320 1440 380 Q 1680 440 1920 400"
        fill="none"
        stroke={c.ink}
        strokeWidth="1.4"
      />
      <path
        d="M 0 445 Q 200 405 400 425 Q 600 445 800 405 Q 1040 365 1240 430 Q 1480 495 1680 445 L 1920 435"
        fill="none"
        stroke={c.ink}
        strokeWidth="1.5"
      />
      <path
        d="M 0 490 Q 240 450 480 470 Q 720 490 960 450 Q 1200 410 1440 470 Q 1680 530 1920 490"
        fill="none"
        stroke={c.ink}
        strokeWidth="1.7"
      />
      <path
        d="M 0 540 Q 200 510 400 525 Q 600 540 800 510 Q 1040 480 1240 525 Q 1480 570 1680 540 L 1920 535 L 1920 600 L 0 600 Z"
        fill={c.ink}
      />
      <g stroke={c.ink} strokeWidth="1" fill="none">
        {Array.from({ length: 32 }).map((_, i) => {
          const x = i * 60 + (i % 2) * 10;
          const y = 520 + Math.sin(i * 1.4) * 6;
          const h = 10 + (i % 3) * 3;
          return (
            <g key={i} transform={`translate(${x} ${y})`}>
              <polygon points={`0,-${h} -${h * 0.4},0 ${h * 0.4},0`} />
            </g>
          );
        })}
      </g>
      <g
        stroke={c.ink}
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      >
        <path d="M 760 150 Q 770 142 780 150 Q 790 142 800 150" />
        <path d="M 820 175 Q 828 169 836 175 Q 844 169 852 175" />
        <path d="M 1080 165 Q 1090 158 1100 165 Q 1110 158 1120 165" />
      </g>
      <Sprig x={120} y={540} scale={1.4} rotation={-10} season={s} />
      <Sprig x={1820} y={540} scale={1.4} rotation={12} season={s} />
      <rect
        width="1920"
        height="600"
        filter={`url(#b-ms-${s}-paper)`}
        opacity="0.55"
        style={{ mixBlendMode: "multiply" }}
      />
    </svg>
  );
}
