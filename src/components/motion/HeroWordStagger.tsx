"use client";

import { Fragment } from "react";

import { HeroReveal } from "@/components/motion/HeroReveal";

// Per-word onset delay for the hero headline cascade. 60ms is at the
// just-noticeable-difference threshold for sequential visual onset —
// perceptible as intentional ordering without feeling sluggish. The h1
// "Quality futons & furniture for your home" is 7 words × 60ms = 420ms
// total cascade, inside the 500ms vestibular tolerance budget for
// non-essential motion. Reduced-motion users land on the final state
// via MotionProvider's MotionConfig reducedMotion="user" wrap — the
// literal initial/whileInView values in HeroReveal are honored
// automatically, no branch needed here.
export const WORD_STAGGER_STEP = 0.06;

// Splits `text` into whitespace-delimited words and wraps each in an
// inline HeroReveal with a cascading delay. Intended for phrasing content
// (h1, h2) where a block-level reveal would break inline word flow.
export function HeroWordStagger({
  text,
  stepSeconds = WORD_STAGGER_STEP,
}: {
  text: string;
  stepSeconds?: number;
}) {
  const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return null;
  return (
    <>
      {words.map((word, i) => (
        <Fragment key={`${i}-${word}`}>
          <HeroReveal as="span" delay={i * stepSeconds}>
            {word}
          </HeroReveal>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </>
  );
}
