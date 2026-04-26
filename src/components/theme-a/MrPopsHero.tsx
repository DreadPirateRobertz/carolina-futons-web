"use client";

import Link from "next/link";
import { Fragment } from "react";
import { m, useReducedMotion } from "framer-motion";

import { LivingSkyClient } from "@/components/illustrations/LivingSkyClient";

// Theme A — 'Mr Pops Playful' hero.
//
// Full-screen section: the LivingSky illustration fills the top band (natural
// proportional height at full width ≈ 200–250px), then a warm espresso-cream
// gradient transitions into the headline + CTA area. The composition feels
// like standing in the showroom doorway looking out at the Blue Ridge sky.
//
// Kinetic word stagger: each word of the h1 fades up in sequence at 60ms
// intervals — same mechanic as HeroWordStagger but inlined here so the hero
// can be self-contained without pulling a server component into a client tree.

const WORD_STAGGER_MS = 0.06;

function WordStagger({ text }: { text: string }) {
  const reduce = useReducedMotion() ?? false;
  const words = text.trim().split(/\s+/);
  return (
    <>
      {words.map((word, i) => (
        <Fragment key={`${i}-${word}`}>
          {reduce ? (
            <span>{word}</span>
          ) : (
            <m.span
              className="inline-block"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: i * WORD_STAGGER_MS, ease: "easeOut" }}
            >
              {word}
            </m.span>
          )}
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </>
  );
}

export function MrPopsHero() {
  const reduce = useReducedMotion() ?? false;

  const fadeUp = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: "easeOut" as const },
        };

  return (
    <section
      aria-label="Hero"
      data-slot="mrpops-hero"
      className="relative flex min-h-[100svh] flex-col overflow-hidden bg-cf-cream"
    >
      {/* Sky band — spans full width at top, natural proportional height */}
      <div
        aria-hidden="true"
        className="relative w-full shrink-0 overflow-hidden"
      >
        <LivingSkyClient />
        {/* Warm fade from sky edge to cream below */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-cf-cream" />
      </div>

      {/* Main content — grows to fill remaining viewport height */}
      <div className="relative flex flex-1 flex-col justify-center px-6 py-10 sm:px-10 md:px-16 lg:px-20">
        {/* Warm espresso accent bar — playful visual anchor */}
        <div
          aria-hidden="true"
          className="mb-8 h-0.5 w-12 bg-cf-espresso"
        />

        <m.p
          className="text-xs font-semibold uppercase tracking-[0.22em] text-cf-espresso/70"
          {...fadeUp(0)}
        >
          Family owned since 1991
        </m.p>

        <h1 className="mt-4 font-heading text-[clamp(36px,6.5vw,88px)] font-bold uppercase leading-[1.04] tracking-tight text-cf-espresso">
          <WordStagger text="Quality futons & furniture for your home" />
        </h1>

        <m.p
          className="mt-5 max-w-prose text-[17px] leading-relaxed text-cf-charcoal/75"
          {...fadeUp(0.55)}
        >
          Hendersonville, NC. Hardwood frames built by hand, mattresses we
          actually sleep on, and delivery that shows up.
        </m.p>

        <m.div className="mt-8 flex flex-wrap gap-3" {...fadeUp(0.7)}>
          <Link
            href="/shop"
            className="inline-flex h-12 items-center justify-center rounded-md bg-cf-espresso px-7 text-sm font-semibold text-cf-cream shadow transition-colors hover:bg-cf-espresso/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-espresso focus-visible:ring-offset-2"
          >
            Shop everything
          </Link>
          <Link
            href="/shop/futon-frames"
            className="inline-flex h-12 items-center justify-center rounded-md border-2 border-cf-espresso px-7 text-sm font-semibold text-cf-espresso transition-colors hover:bg-cf-espresso hover:text-cf-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-espresso focus-visible:ring-offset-2"
          >
            Browse futons
          </Link>
        </m.div>

        {/* Scroll cue */}
        <m.div
          aria-hidden="true"
          className="mt-14 flex items-center gap-3"
          {...fadeUp(0.9)}
        >
          <div className="h-px w-8 bg-cf-espresso/30" />
          <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-cf-espresso/40">
            Scroll to explore
          </span>
        </m.div>
      </div>

      {/* Bottom decorative rule */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-px bg-cf-espresso/10"
      />
    </section>
  );
}
