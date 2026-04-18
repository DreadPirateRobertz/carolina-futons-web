"use client";

import { m, useReducedMotion } from "framer-motion";
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
// bundle budget.
//
// WCAG 2.3.3 safety (cf-3qt.7.M.FIX.2 per-component gate): we can't rely on
// the app-wide MotionConfig reducedMotion="user" alone here — framer's
// auto-honor applies to the variants API, not to the literal `initial` /
// `whileInView` objects used below. So we read useReducedMotion() and
// drop the motion props entirely on reduce, which is byte-for-byte static
// rather than a zeroed-transform render with the subscription overhead.
export function HeroReveal({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const reduce = useReducedMotion() ?? false;

  if (reduce) {
    return <m.div data-slot="hero-reveal" data-reduced-motion="1">{children}</m.div>;
  }

  return (
    <m.div
      data-slot="hero-reveal"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
    >
      {children}
    </m.div>
  );
}
