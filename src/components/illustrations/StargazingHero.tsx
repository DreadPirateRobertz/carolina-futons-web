"use client";

// Theme C — Stargazing hero. Bear lying on hill under milky way; fireflies
// twinkle continuously, shooting star fires every 8s, milky way drifts slowly.
// Source: design-harvest/v3-02-stargazing.svg + v3-heroes.jsx (HeroStargaze).

import { useEffect, useRef, useState } from "react";

const REDUCE_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const FIREFLIES: ReadonlyArray<{ x: number; y: number; delay: number }> = [
  { x: 180, y: 442, delay: 0 },
  { x: 340, y: 499, delay: 0.6 },
  { x: 424, y: 559, delay: 1.2 },
  { x: 580, y: 599, delay: 1.8 },
  { x: 665, y: 633, delay: 2.4 },
  { x: 825, y: 477, delay: 0.3 },
  { x: 929, y: 548, delay: 0.9 },
  { x: 1046, y: 598, delay: 1.5 },
  { x: 1166, y: 635, delay: 2.1 },
  { x: 1269, y: 465, delay: 2.7 },
  { x: 1429, y: 522, delay: 0.45 },
  { x: 1513, y: 582, delay: 1.05 },
  { x: 1670, y: 622, delay: 1.65 },
  { x: 254, y: 456, delay: 2.25 },
];

export function StargazingHero() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const shootRef = useRef<SVGGElement | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(REDUCE_MOTION_QUERY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot client-only seed for SSR media-query fallback
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  return (
    <div className="relative h-[80vh] w-full overflow-hidden bg-[#0E1838]">
      <svg
        viewBox="0 0 1920 800"
        preserveAspectRatio="xMidYMid slice"
        className="block h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="hs-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0E1838" />
            <stop offset="60%" stopColor="#1F2A4A" />
            <stop offset="100%" stopColor="#3A2548" />
          </linearGradient>
          <radialGradient id="hs-mw" cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#8FA8E0" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#8FA8E0" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#8FA8E0" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hs-moon" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FAF2DE" stopOpacity="1" />
            <stop offset="100%" stopColor="#FAF2DE" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="1920" height="800" fill="url(#hs-sky)" />

        {/* Milky way — slow horizontal drift */}
        <g className={reduceMotion ? "" : "stargaze-milkyway"}>
          <ellipse
            cx="960"
            cy="280"
            rx="1400"
            ry="180"
            fill="url(#hs-mw)"
            transform="rotate(-12 960 280)"
          />
        </g>

        {/* Stars — gentle twinkle via opacity keyframes */}
        <g className={reduceMotion ? "" : "stargaze-stars"}>
          {[
            [71, 41, 1, 0.88], [142, 82, 1.4, 0.51], [213, 123, 1.8, 0.22],
            [284, 164, 2.2, 0.28], [355, 205, 0.6, 0.63], [426, 246, 1, 0.95],
            [497, 287, 1.4, 0.99], [568, 328, 1.8, 0.88], [639, 369, 2.2, 0.51],
            [710, 30, 0.6, 0.22], [781, 71, 1, 0.28], [852, 112, 1.4, 0.63],
            [923, 153, 1.8, 0.95], [994, 194, 2.2, 0.99], [1065, 235, 0.6, 0.88],
            [1136, 276, 1, 0.51], [1207, 317, 1.4, 0.22], [1278, 358, 1.8, 0.28],
            [1349, 19, 2.2, 0.63], [1420, 60, 0.6, 0.95], [1491, 101, 1, 0.99],
            [1562, 142, 1.4, 0.88], [1633, 183, 1.8, 0.51], [1704, 224, 2.2, 0.22],
            [1775, 265, 0.6, 0.28], [1846, 306, 1, 0.63], [1917, 347, 1.4, 0.95],
            [68, 8, 1.8, 0.99], [139, 49, 2.2, 0.88], [210, 90, 0.6, 0.51],
            [281, 131, 1, 0.22], [352, 172, 1.4, 0.28], [423, 213, 1.8, 0.63],
            [494, 254, 2.2, 0.95], [565, 295, 0.6, 0.99], [636, 336, 1, 0.88],
            [707, 377, 1.4, 0.51], [778, 38, 1.8, 0.22], [849, 79, 2.2, 0.28],
            [920, 120, 0.6, 0.63], [991, 161, 1, 0.95], [1062, 202, 1.4, 0.99],
            [1133, 243, 1.8, 0.88], [1204, 284, 2.2, 0.51], [1275, 325, 0.6, 0.22],
            [1346, 366, 1, 0.28], [1417, 27, 1.4, 0.63], [1488, 68, 1.8, 0.95],
            [1559, 109, 2.2, 0.99], [1630, 150, 0.6, 0.88], [1701, 191, 1, 0.51],
            [1772, 232, 1.4, 0.22], [1843, 273, 1.8, 0.28], [1914, 314, 2.2, 0.63],
          ].map(([cx, cy, r, op], i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="#FAE8B0"
              opacity={op}
            />
          ))}
          {/* Bright nova stars */}
          <circle cx="320" cy="160" r="1.8" fill="#FAF2DE" />
          <circle cx="320" cy="160" r="6" fill="#FAF2DE" opacity="0.25" />
          <circle cx="1180" cy="100" r="2.2" fill="#FAF2DE" />
          <circle cx="1180" cy="100" r="8" fill="#FAF2DE" opacity="0.25" />
          <circle cx="1620" cy="220" r="1.6" fill="#FAF2DE" />
          <circle cx="1620" cy="220" r="5" fill="#FAF2DE" opacity="0.25" />
        </g>

        {/* Shooting star — fires every 8s */}
        <g
          ref={shootRef}
          className={reduceMotion ? "opacity-0" : "stargaze-shoot"}
        >
          <line x1="0" y1="60" x2="80" y2="100" stroke="#FAF2DE" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
          <circle cx="80" cy="100" r="3" fill="#FAF2DE" />
        </g>

        {/* Moon */}
        <g transform="translate(1522 224)">
          <circle r="220" fill="url(#hs-moon)" />
          <circle r="68" fill="#FAF2DE" />
          <circle cx="-22" cy="-12" r="10" fill="#3A2548" opacity="0.18" />
          <circle cx="14" cy="18" r="7" fill="#3A2548" opacity="0.2" />
          <circle cx="22" cy="-22" r="5" fill="#3A2548" opacity="0.18" />
        </g>

        {/* Ridges — Blue Ridge silhouette layers */}
        <path d="M 0 423 Q 480 393 960 403 T 1920 418 L 1920 800 L 0 800 Z" fill="#3F4A78" />
        <path d="M 0 471 Q 480 436 960 446 T 1920 466 L 1920 800 L 0 800 Z" fill="#2A3658" />
        <path d="M 0 507 Q 480 467 960 482 T 1920 502 L 1920 800 L 0 800 Z" fill="#1A2440" />
        <path d="M 0 538 Q 480 498 960 513 T 1920 533 L 1920 800 L 0 800 Z" fill="#0E1424" />

        {/* Pines on horizon */}
        <g transform="translate(0 510)">
          {[80, 180, 1700, 1820].map((tx, i) => (
            <g key={i} transform={`translate(${tx} 0) scale(${i % 2 === 0 ? 1.2 : 1.6})`}>
              <rect x="-2" y="0" width="4" height="10" fill="#3A2518" />
              <polygon points="0,-50 -16,-26 16,-26" fill="#1F3A2A" />
              <polygon points="0,-32 -18,-8 18,-8" fill="#1F3A2A" />
              <polygon points="0,-14 -20,8 20,8" fill="#1F3A2A" />
            </g>
          ))}
        </g>

        {/* Bear lying on hill */}
        <g transform="translate(960 599) scale(2.6)">
          <ellipse cx="0" cy="0" rx="62" ry="14" fill="#06091A" />
          <ellipse cx="44" cy="-8" rx="22" ry="14" fill="#06091A" />
          <circle cx="38" cy="-18" r="6" fill="#06091A" />
          <circle cx="50" cy="-18" r="6" fill="#06091A" />
          <ellipse cx="56" cy="-4" rx="8" ry="5" fill="#A8806A" />
          <ellipse cx="60" cy="-7" rx="2" ry="1.5" fill="#1A0E08" />
          <circle cx="44" cy="-12" r="1.4" fill="#FAF2DE" />
          <circle cx="52" cy="-12" r="1.4" fill="#FAF2DE" />
          <ellipse cx="-10" cy="-2" rx="32" ry="10" fill="#4A2818" opacity="0.6" />
          <ellipse cx="-46" cy="2" rx="10" ry="5" fill="#06091A" />
        </g>

        {/* Fireflies — vibrant twinkle, staggered phase */}
        {FIREFLIES.map((f, i) => (
          <g
            key={i}
            transform={`translate(${f.x} ${f.y})`}
            className={reduceMotion ? "" : "stargaze-firefly"}
            style={{ animationDelay: `${f.delay}s` }}
          >
            <circle r="10" fill="#F5E89A" opacity="0.25" />
            <circle r="3" fill="#F5E89A" />
          </g>
        ))}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-24 sm:pb-32">
        <div className="px-6 text-center text-[#FAF2DE]">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#F5E89A]">
            Crafted in the Blue Ridge
          </p>
          <h1 className="mt-3 font-serif text-3xl sm:text-5xl">Furniture that earns its place.</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base opacity-80">
            Family-owned since 1991. Solid hardwood frames + American mattresses.
            Rest under our stars.
          </p>
        </div>
      </div>

      <style jsx>{`
        :global(.stargaze-firefly) {
          animation: stargaze-firefly-twinkle 3.6s ease-in-out infinite;
          transform-origin: center;
          filter: drop-shadow(0 0 4px #f5e89a);
        }
        :global(.stargaze-stars) {
          animation: stargaze-star-twinkle 6s ease-in-out infinite;
        }
        :global(.stargaze-milkyway) {
          animation: stargaze-mw-drift 60s linear infinite;
        }
        :global(.stargaze-shoot) {
          animation: stargaze-shoot 8s ease-in infinite;
          opacity: 0;
        }
        @keyframes stargaze-firefly-twinkle {
          0%, 100% { opacity: 0.15; transform: translate(0, 0) scale(0.85); }
          50% { opacity: 1; transform: translate(0, -6px) scale(1.15); }
        }
        @keyframes stargaze-star-twinkle {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 1; }
        }
        @keyframes stargaze-mw-drift {
          0% { transform: translateX(-30px); }
          50% { transform: translateX(30px); }
          100% { transform: translateX(-30px); }
        }
        @keyframes stargaze-shoot {
          0%, 88% { opacity: 0; transform: translate(-100px, -50px); }
          92% { opacity: 1; }
          100% { opacity: 0; transform: translate(1900px, 350px); }
        }
        @media (prefers-reduced-motion: reduce) {
          :global(.stargaze-firefly),
          :global(.stargaze-stars),
          :global(.stargaze-milkyway),
          :global(.stargaze-shoot) {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
