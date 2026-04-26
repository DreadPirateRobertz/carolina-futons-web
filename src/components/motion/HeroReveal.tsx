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
// no-op on pure inline boxes). "li" supports PLP card stagger — HeroReveal
// has to sit directly inside a <ul> there, and a div-in-ul is invalid HTML.
//
// `once` (default true) keeps the fire-once behaviour. Pass false to
// re-animate on every enter/exit — used by HeroWordStagger's scrollOut
// mode so the headline fades back when the hero scrolls away.
//
// Uses `m` (not `motion`) so the LazyMotion features in MotionProvider stay
// effective — `motion` would force-load the full feature set and blow the
// bundle budget.
//
// WCAG 2.3.3 safety (cf-3qt.7.M.FIX.2 per-component gate): MotionConfig
// reducedMotion="user" in MotionProvider does not reliably suppress literal
// initial/whileInView props across all framer-motion versions, so each
// motion component gates itself via useReducedMotion(). Reading it here and
// dropping motion props entirely on reduce is also cheaper than a zeroed-
// transform render that still subscribes to the animation scheduler.
// Defaults to true (motion suppressed) when the hook returns null — the
// safe side for WCAG compliance during the SSR→hydration gap.
export function HeroReveal({
  children,
  delay = 0,
  as = "div",
  once = true,
}: {
  children: ReactNode;
  delay?: number;
  as?: "div" | "span" | "li";
  // Controlled by HeroWordStagger via scrollOut. Direct callers can leave
  // this at the default (true) unless building a sticky-hero layout that
  // must re-reveal on scroll-up.
  once?: boolean;
}) {
  const reduce = useReducedMotion() ?? true;

  const Tag = as === "span" ? m.span : as === "li" ? m.li : m.div;
  const inlineClass = as === "span" ? "inline-block" : undefined;

  if (reduce) {
    return (
      <Tag
        data-slot="hero-reveal"
        data-reduced-motion="1"
        className={inlineClass}
      >
        {children}
      </Tag>
    );
  }

  return (
    <Tag
      data-slot="hero-reveal"
      className={inlineClass}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.4 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" as const }}
    >
      {children}
    </Tag>
  );
}
