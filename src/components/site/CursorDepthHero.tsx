"use client";

import { useRef, type ReactNode } from "react";
import {
  m,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  useScroll,
} from "framer-motion";

// cf-ypvd.7: cursor-aware 3-layer parallax on the home hero.
//
// Three depth planes responding to cursor X/Y relative to the hero section:
//   Plane 1 — textSlot:  shifts *counter* to cursor at 0.5× rate (-6px max X)
//   Plane 2 — carousel:  shifts *with* cursor at 1× rate (+6px max X)
//   Plane 3 — glow:      shifts *with* cursor at 1.5× rate (+9px, decorative)
//
// Relative motion between plane 1 and plane 2 = 12px — the spec's max depth.
// Scroll-Y handled by the inner useScroll hook mirroring HeroParallax behavior.
//
// useReducedMotion() check: when reduce=true, all spring values are inert
// and m.div style props are omitted — avoids zeroed-transform overhead
// (same pattern as HeroReveal + WCAG 2.3.3 compliance).

const SPRING = { stiffness: 140, damping: 22, mass: 0.6 };
const MAX_X = 6; // px max X shift for the mid-plane
const MAX_Y = 4; // px max Y shift for the mid-plane

type Props = {
  textSlot: ReactNode;
  carouselSlot: ReactNode;
};

export function CursorDepthHero({ textSlot, carouselSlot }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion() ?? false;

  // Raw -1→1 cursor position values (initialised to 0 = centred)
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  // Spring-smoothed versions
  const smoothX = useSpring(rawX, SPRING);
  const smoothY = useSpring(rawY, SPRING);

  // Plane transforms derived from the same spring source
  const textX = useTransform(smoothX, [-1, 1], [MAX_X * 0.5, -MAX_X * 0.5]);
  const textY = useTransform(smoothY, [-1, 1], [MAX_Y * 0.5, -MAX_Y * 0.5]);
  const carX = useTransform(smoothX, [-1, 1], [-MAX_X, MAX_X]);
  const carY = useTransform(smoothY, [-1, 1], [-MAX_Y, MAX_Y]);
  const glowX = useTransform(smoothX, [-1, 1], [-MAX_X * 1.5, MAX_X * 1.5]);
  const glowY = useTransform(smoothY, [-1, 1], [-MAX_Y * 1.5, MAX_Y * 1.5]);

  // Scroll-Y parallax on the carousel (mirrors existing HeroParallax)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const scrollY = useTransform(scrollYProgress, [0, 1], [0, -50]);

  function handleMouseMove(e: React.MouseEvent<HTMLElement>) {
    if (reduce) return;
    const rect = sectionRef.current?.getBoundingClientRect();
    if (!rect) return;
    rawX.set(((e.clientX - rect.left) / rect.width) * 2 - 1);
    rawY.set(((e.clientY - rect.top) / rect.height) * 2 - 1);
  }

  function handleMouseLeave() {
    rawX.set(0);
    rawY.set(0);
  }

  return (
    <m.section
      ref={sectionRef}
      data-slot="cursor-depth-hero"
      className="relative overflow-hidden bg-cf-cream"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Decorative glow — plane 3 (fastest shift, purely visual) */}
      <m.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={reduce ? undefined : { x: glowX, y: glowY }}
      >
        <div className="absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 rounded-full bg-cf-cta/5 blur-3xl" />
      </m.div>

      <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center md:py-24 lg:px-8">
        {/* Text column — plane 1 (counter-shift) */}
        <m.div
          data-slot="cursor-depth-text"
          style={reduce ? undefined : { x: textX, y: textY }}
        >
          {textSlot}
        </m.div>

        {/* Carousel column — plane 2 (with-cursor shift) + scroll-Y */}
        <m.div
          data-slot="cursor-depth-carousel"
          style={reduce ? undefined : { x: carX, y: carY, translateY: scrollY }}
        >
          {carouselSlot}
        </m.div>
      </div>
    </m.section>
  );
}
