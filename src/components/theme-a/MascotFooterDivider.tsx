"use client";

// cf-c8dc: theme-a variant — keeps the dawn/cream palette appropriate for
// the theme-a exploration route, but mirrors the animation contract from
// the production divider (breathing sleeping bear, gentle moon pulse).

import { motion, useReducedMotion } from "framer-motion";
import { V3_PAL as c } from "./MascotPalette";
import { Bear } from "./MascotCharacters";

export function MascotFooterDivider({ className }: { className?: string }) {
  const reduce = useReducedMotion() ?? false;

  return (
    <svg
      data-slot="mascot-footer-divider"
      viewBox="0 0 1920 200"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      style={{ display: "block", width: "100%", height: "100%" }}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="v3fd-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.sky2} />
          <stop offset="100%" stopColor={c.cream} />
        </linearGradient>
        <filter id="v3fd-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves={3} seed={2} />
          <feColorMatrix values="0 0 0 0 0.18  0 0 0 0 0.10  0 0 0 0 0.06  0 0 0 0.14 0" />
        </filter>
      </defs>
      <rect width="1920" height="200" fill="url(#v3fd-sky)" />

      {/* Moon — gentle pulse. cx=1100 keeps the moon inside the
          375px-visible centre column [772.5, 1147.5] (cf-f6g, mirrors the
          production divider). */}
      <motion.circle
        data-slot="footer-moon"
        cx={1100}
        cy={60}
        r={30}
        fill={c.cream}
        initial={{ opacity: 0.85 }}
        animate={reduce ? { opacity: 0.85 } : { opacity: [0.85, 1, 0.85] }}
        transition={{
          duration: 5,
          repeat: reduce ? 0 : Infinity,
          ease: "easeInOut",
        }}
      />

      <path d="M 0 100 Q 240 80 480 90 Q 720 100 960 75 Q 1200 50 1440 95 Q 1680 140 1920 105 L 1920 200 L 0 200 Z" fill={c.ridge3} />
      <path d="M 0 130 Q 200 110 400 120 Q 600 130 800 110 Q 1040 85 1240 125 Q 1480 165 1680 135 L 1920 130 L 1920 200 L 0 200 Z" fill={c.ridge2} />
      <g fill={c.ridge1}>
        {Array.from({ length: 40 }).map((_, i) => {
          const x = i * 50 + (i % 2) * 8;
          const y = 120 + Math.sin(i * 1.3) * 4;
          const h = 10 + (i % 3) * 3;
          return (
            <polygon
              key={i}
              points={`${x},${y - h} ${x - h * 0.32},${y} ${x + h * 0.32},${y}`}
            />
          );
        })}
      </g>
      <path d="M 0 160 Q 240 150 480 156 Q 720 162 960 150 Q 1200 138 1440 155 Q 1680 175 1920 158 L 1920 200 L 0 200 Z" fill={c.ridge1} />

      {/* Sleeping bear — chest breathes */}
      <motion.g
        data-slot="footer-bear"
        transform="translate(960 145)"
        style={{ transformOrigin: "0px 20px", transformBox: "fill-box" }}
        animate={reduce ? undefined : { scaleY: [1, 1.045, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <Bear pose="sleeping" scale={0.7} />
      </motion.g>

      <rect
        width="1920"
        height="200"
        filter="url(#v3fd-grain)"
        opacity="0.35"
        style={{ mixBlendMode: "multiply" }}
      />
    </svg>
  );
}
