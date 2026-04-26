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

// Splits `text` into whitespace-delimited words and wraps each in an
// inline HeroReveal with a cascading delay. Intended for phrasing content
// (h1, h2) where a block-level reveal would break inline word flow.
//
// `scrollOut` (default false) passes `once={false}` to each word's HeroReveal
// so words fade/slide back out when the hero scrolls below the viewport —
// useful for sticky-hero layouts where the headline re-enters on scroll-up.
//
// `oscillateWeight` (default false) adds a one-shot wght axis burst during
// entrance: each word springs 300→900→600 over 1.2s, staggered by the same
// stepSeconds offset. Requires the Playfair Display variable font to be loaded
// with axes: ["wght"] in layout.tsx (already done in Phase D6). Skipped for
// users with prefers-reduced-motion.
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
  const reduce = useReducedMotion() ?? false;
  const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return null;
  return (
    <>
      {words.map((word, i) => {
        const delay = i * stepSeconds;
        return (
          <Fragment key={`${i}-${word}`}>
            <HeroReveal as="span" delay={delay} once={!scrollOut}>
              {oscillateWeight && !reduce ? (
                // Inner span drives the wght axis burst. `animate` fires once
                // on mount; `delay + 0.3` lets the opacity/y reveal lead so
                // the weight change reads as emphasis rather than jitter.
                <m.span
                  className="inline-block"
                  animate={{
                    fontVariationSettings: [
                      '"wght" 300',
                      '"wght" 900',
                      '"wght" 600',
                    ],
                  }}
                  transition={{
                    duration: 1.2,
                    delay: delay + 0.3,
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
