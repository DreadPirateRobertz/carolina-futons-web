"use client";

import { m } from "framer-motion";
import type { ReactNode } from "react";

// Hero copy scroll-reveal wrapper. Phase 7 visual-prototype demo for the
// motion foundation: opacity 0→1 + y 20→0 over 0.6s, fired once when the
// element enters the viewport (no replay on scroll-back).
//
// `delay` lets the caller stagger the headline and subtitle so the
// subhead lands a hair after the h1 — gives the title room to read first.
//
// Uses `m` (not `motion`) so the LazyMotion features in MotionProvider stay
// effective — `motion` would force-load the full feature set and blow the
// bundle budget. Reduced-motion enforcement comes from MotionProvider's
// MotionConfig reducedMotion="user" wrap (framer's variant-level auto-honor
// does NOT apply to literal `initial`/`whileInView` objects like the ones
// below — MotionConfig is what makes this WCAG 2.3.3-safe).
export function HeroReveal({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
    >
      {children}
    </m.div>
  );
}
