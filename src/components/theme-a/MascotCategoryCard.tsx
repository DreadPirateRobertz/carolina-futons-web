"use client";
import { useState } from "react";
import { V3_PAL as c } from "./MascotPalette";
import { Bear, Deer, Fox, Owl, Pine } from "./MascotCharacters";

type AnimalKey = "bear" | "fox" | "deer" | "owl";

type Props = {
  title: string;
  subtitle: string;
  animal: AnimalKey;
  accent: string;
  href: string;
};

function AnimalComponent({
  animal,
  hover,
}: {
  animal: AnimalKey;
  hover: boolean;
}) {
  if (animal === "bear")
    return <Bear pose="sitting" scale={1.6} />;
  if (animal === "fox") return <Fox scale={1.6} />;
  if (animal === "deer") return <Deer scale={1.6} />;
  return <Owl scale={1.6} />;
}

export function MascotCategoryCard({ title, subtitle, animal, accent, href }: Props) {
  const [hover, setHover] = useState(false);
  const filterId = `cc-${title.replace(/\s+/g, "-").toLowerCase()}-grain`;

  return (
    <a
      href={href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      style={{
        display: "block",
        position: "relative",
        borderRadius: 14,
        overflow: "hidden",
        background: hover ? accent : c.paperWarm,
        transition: "background 400ms, transform 300ms, box-shadow 300ms",
        cursor: "pointer",
        height: "100%",
        minHeight: 280,
        boxShadow: hover
          ? "0 16px 40px rgba(58,37,24,.22)"
          : "0 4px 12px rgba(58,37,24,.08)",
        transform: hover ? "translateY(-4px)" : "translateY(0)",
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
        {/* Animal slides up on hover */}
        <g
          style={{
            transition: "transform 500ms cubic-bezier(.2,.9,.3,1.2)",
            transform: `translate(300px, ${hover ? 320 : 460}px)`,
          }}
        >
          <AnimalComponent animal={animal} hover={hover} />
        </g>
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
      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: 20,
          fontFamily: "var(--font-source-sans)",
          fontSize: 13,
          fontWeight: 600,
          color: c.ink,
          opacity: hover ? 1 : 0,
          transform: `translateX(${hover ? 0 : -6}px)`,
          transition: "all 350ms",
        }}
      >
        Shop now →
      </div>
    </a>
  );
}
