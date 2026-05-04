"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { V3_PAL as c } from "./MascotPalette";
import { Bear, Deer, Fox, Owl } from "./MascotCharacters";

type AnimalKey = "bear" | "fox" | "deer" | "owl";

type Props = {
  title: string;
  subtitle: string;
  animal: AnimalKey;
  accent: string;
  href: string;
};

function AnimalComponent({ animal }: { animal: AnimalKey }) {
  if (animal === "bear") return <Bear pose="sitting" scale={1.6} />;
  if (animal === "fox") return <Fox scale={1.6} />;
  if (animal === "deer") return <Deer scale={1.6} />;
  return <Owl scale={1.6} />;
}

const CARD_VARIANTS = {
  rest: { y: 0, boxShadow: "0 4px 12px rgba(58,37,24,.08)" },
  hover: { y: -4, boxShadow: "0 16px 40px rgba(58,37,24,.22)" },
};

export function MascotCategoryCard({ title, subtitle, animal, accent, href }: Props) {
  const [hover, setHover] = useState(false);
  const filterId = `mcc-${title.replace(/\s+/g, "-").toLowerCase()}-grain`;

  return (
    <motion.a
      href={href}
      data-slot="category-card"
      variants={CARD_VARIANTS}
      initial="rest"
      animate={hover ? "hover" : "rest"}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      style={{
        display: "block",
        position: "relative",
        borderRadius: 14,
        overflow: "hidden",
        background: hover ? accent : c.paperWarm,
        transition: "background 400ms",
        cursor: "pointer",
        height: "100%",
        minHeight: 280,
        textDecoration: "none",
      }}
      aria-label={title}
    >
      <svg
        viewBox="0 0 600 400"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        aria-hidden="true"
      >
        <defs>
          <filter id={filterId}>
            <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves={3} seed={9} />
            <feColorMatrix values="0 0 0 0 0.18  0 0 0 0 0.10  0 0 0 0 0.06  0 0 0 0.14 0" />
          </filter>
        </defs>
        <circle
          cx="480"
          cy="80"
          r="40"
          fill={c.sun}
          opacity={hover ? 0.95 : 0.7}
          style={{ transition: "opacity 400ms" }}
        />
        <path d="M 0 220 Q 150 200 300 210 Q 450 220 600 195 L 600 400 L 0 400 Z" fill={c.ridge3} opacity="0.6" />
        <path d="M 0 270 Q 200 240 400 260 Q 500 270 600 245 L 600 400 L 0 400 Z" fill={c.ridge2} />
        <g fill={c.ridge1}>
          {Array.from({ length: 14 }).map((_, i) => {
            const x = i * 50 + 10;
            const y = 255 + Math.sin(i) * 4;
            const h = 14 + (i % 2) * 4;
            return (
              <polygon key={i} points={`${x},${y - h} ${x - h * 0.3},${y} ${x + h * 0.3},${y}`} />
            );
          })}
        </g>
        <path d="M 0 310 Q 200 295 400 305 Q 500 310 600 295 L 600 400 L 0 400 Z" fill={c.ridge1} />
        {/* Animal slides up from below on hover — spring physics via Framer Motion */}
        <motion.g
          animate={{ y: hover ? 320 : 460 }}
          transition={{ type: "spring", stiffness: 180, damping: 20 }}
          style={{ x: 300 }}
        >
          <AnimalComponent animal={animal} />
        </motion.g>
        <rect
          width="600"
          height="400"
          filter={`url(#${filterId})`}
          opacity="0.3"
          style={{ mixBlendMode: "multiply" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          top: 18,
          left: 20,
          right: 20,
          fontFamily: "var(--font-source-sans)",
          fontSize: 11,
          letterSpacing: ".1em",
          textTransform: "uppercase",
          color: c.inkSoft,
          opacity: 0.75,
        }}
      >
        {subtitle}
      </div>
      <div
        style={{
          position: "absolute",
          top: 38,
          left: 20,
          right: 20,
          fontFamily: "var(--font-playfair)",
          fontSize: 30,
          fontWeight: 700,
          color: c.ink,
          lineHeight: 1.05,
        }}
      >
        {title}
      </div>
      <motion.div
        animate={{ opacity: hover ? 1 : 0, x: hover ? 0 : -6 }}
        transition={{ duration: 0.25 }}
        style={{
          position: "absolute",
          bottom: 16,
          left: 20,
          fontFamily: "var(--font-source-sans)",
          fontSize: 13,
          fontWeight: 600,
          color: c.ink,
          pointerEvents: "none",
        }}
      >
        Shop now →
      </motion.div>
    </motion.a>
  );
}
