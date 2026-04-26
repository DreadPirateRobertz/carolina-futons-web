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
// `as` picks the wrapper element. Default "div" is correct for block-level
// reveals (category cards, subtitle paragraphs). Pass "span" for inline
// reveals inside phrasing content — e.g. per-word hero headline stagger,
// where a div inside an h1 would break word flow. When as="span" we also
// set inline-block so the y-transform has somewhere to apply (transforms
// no-op on pure inline boxes).
//
// `once` (default true) keeps the original fire-once behaviour. Pass false
// to re-animate on every enter/exit — used by HeroWordStagger's scrollOut
// mode so the headline fades back when the hero scrolls away.
//
// Uses `m` (not `motion`) so the LazyMotion features in MotionProvider stay
// effective — `motion` would force-load the full feature set and blow the
// bundle budget.
//
// WCAG 2.3.3 safety (cf-3qt.7.M.FIX.2 per-component gate): we can't rely on
// the app-wide MotionConfig reducedMotion="user" alone here — framer's
// auto-honor applies to the variants API, not to the literal `initial` /
// `whileInView` objects used below. So we read useReducedMotion() and drop
// the motion props entirely on reduce, which is byte-for-byte static rather
// than a zeroed-transform render with the subscription overhead.
export function HeroReveal({
  children,
  delay = 0,
  as = "div",
  once = true,
}: {
  children: ReactNode;
  delay?: number;
  // "li" supports PLP card stagger — HeroReveal has to sit directly inside a
  // <ul> there, and a div-in-ul is invalid HTML / breaks list semantics.
  as?: "div" | "span" | "li";
  // Set false to re-animate on every enter/exit (scroll-out reveal).
  // Default true keeps existing behaviour: fires once, stays revealed.
  once?: boolean;
}) {
  const reduce = useReducedMotion() ?? false;

  if (reduce) {
    if (as === "span") {
      return (
        <m.span
          data-slot="hero-reveal"
          data-reduced-motion="1"
          className="inline-block"
        >
          {children}
        </m.span>
      );
    }
    if (as === "li") {
      return (
        <m.li data-slot="hero-reveal" data-reduced-motion="1">
          {children}
        </m.li>
      );
    }
    return (
      <m.div data-slot="hero-reveal" data-reduced-motion="1">
        {children}
      </m.div>
    );
  }

  const motionProps = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once, amount: 0.4 },
    transition: { duration: 0.6, delay, ease: "easeOut" as const },
  };
  if (as === "span") {
    return (
      <m.span data-slot="hero-reveal" className="inline-block" {...motionProps}>
        {children}
      </m.span>
    );
  }
  if (as === "li") {
    return (
      <m.li data-slot="hero-reveal" {...motionProps}>
        {children}
      </m.li>
    );
  }
  return (
    <m.div data-slot="hero-reveal" {...motionProps}>
      {children}
    </m.div>
  );
}
