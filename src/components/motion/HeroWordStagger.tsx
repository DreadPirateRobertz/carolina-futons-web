"use client";

import { m, useReducedMotion } from "framer-motion";
import { Fragment } from "react";

import { HeroReveal } from "@/components/motion/HeroReveal";

// Per-word onset delay for the hero headline cascade. 60ms is at the
// just-noticeable-difference threshold for sequential visual onset —
// perceptible as intentional ordering without feeling sluggish. The h1
// "Quality futons & furniture for your home" is 7 words × 60ms = 420ms
// total cascade, inside the 500ms vestibular tolerance budget for
// non-essential motion.
export const WORD_STAGGER_STEP = 0.06;

// wght keyframes for the oscillateWeight burst: thin → bold → medium-bold.
// Stagger offsets keep per-word math in one place.
const WGHT_KEYFRAMES: [string, string, string] = [
  '"wght" 300',
  '"wght" 900',
  '"wght" 600',
];
const WGHT_DURATION = 1.2;
// Weight burst starts 0.3s after the word's opacity/y reveal, so the reader
// sees the word appear before the weight snaps — emphasis, not jitter.
const WGHT_LEAD = 0.3;

// Splits `text` into whitespace-delimited words and wraps each in an
// inline HeroReveal with a cascading delay. Intended for phrasing content
// (h1, h2) where a block-level reveal would break inline word flow.
//
// `scrollOut` (default false) passes `once={false}` to each word's HeroReveal
// so words fade/slide back out when the hero scrolls below the viewport —
// useful for sticky-hero layouts where the headline re-enters on scroll-up.
//
// `oscillateWeight` (default false) adds a one-shot wght axis burst during
// entrance: each word springs 300→900→600 over 1.2s. The weight transition
// starts 0.3s after its word's opacity/y reveal delay, so the reader sees
// the word appear before the weight snaps — emphasis rather than jitter.
// Staggered using the same stepSeconds offset as the reveal delay.
// Requires Playfair Display loaded with axes: ["wght"] in layout.tsx (Phase D6).
// Skipped when prefers-reduced-motion is set. Defaults to no motion when the
// hook returns null (safe side during the SSR→hydration gap, per WCAG 2.3.3).
export function HeroWordStagger({
  text,
  stepSeconds = WORD_STAGGER_STEP,
  scrollOut = false,
  oscillateWeight = false,
}: {
  text: string;
  stepSeconds?: number;
  // Pass true for sticky-hero layouts: words fade back out when the hero
  // scrolls away and re-animate on scroll-up.
  scrollOut?: boolean;
  // One-shot variable-font weight burst (300→900→600) on entrance.
  // No-ops when the font lacks a wght axis or prefers-reduced-motion is set.
  oscillateWeight?: boolean;
}) {
  const reduce = useReducedMotion() ?? true;
  const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return null;

  const shouldOscillate = oscillateWeight && !reduce;

  return (
    <>
      {words.map((word, i) => {
        const delay = i * stepSeconds;
        return (
          <Fragment key={`${i}-${word}`}>
            <HeroReveal as="span" delay={delay} once={!scrollOut}>
              {shouldOscillate ? (
                // `animate` (not whileInView) is correct here: this span mounts
                // inside HeroReveal's whileInView gate, so it is already in the
                // viewport when it enters the DOM. A second whileInView would
                // require its own intersection, breaking the timed relationship.
                <m.span
                  className="inline-block"
                  animate={{ fontVariationSettings: WGHT_KEYFRAMES }}
                  transition={{
                    duration: WGHT_DURATION,
                    delay: delay + WGHT_LEAD,
                    ease: "easeOut",
                  }}
                >
                  {word}
                </m.span>
              ) : (
                word
              )}
            </HeroReveal>
            {i < words.length - 1 ? " " : null}
          </Fragment>
        );
      })}
    </>
  );
}
