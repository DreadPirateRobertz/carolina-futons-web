"use client";

import { m, useReducedMotion } from "framer-motion";

// Scrolltelling chapter data for /about — Founding 1991 → Hardwood frames →
// Showroom → Today. Uses framer-motion whileInView for reveal-on-scroll;
// reducedMotion is handled app-wide by MotionProvider's MotionConfig, and
// also read locally to skip transforms entirely (framer's auto-honor covers
// variants but not literal initial/whileInView objects — per HeroReveal convention).

const CHAPTERS = [
  {
    year: "1991",
    eyebrow: "Founding",
    heading: "An idea from the mountains",
    prose:
      "Carolina Futons opened its doors in Hendersonville, NC with one mission: sell furniture built to outlast the trend. No warehouse rows. No assembly required on the living-room floor. Just solid frames, honest mattresses, and people who answer the phone.",
    accent: "◈",
    accentLabel: "founding marker",
  },
  {
    year: "2005",
    eyebrow: "The frames",
    heading: "All hardwood, all American",
    prose:
      "We moved to an all-hardwood catalog — American ash, red oak, and maple. Every frame is built to load-bear as a sofa and a bed without apology. We put the species on the tag and tell you where each one ships from.",
    accent: "◉",
    accentLabel: "hardwood frames marker",
  },
  {
    year: "2015",
    eyebrow: "The showroom",
    heading: "Come and sit on them",
    prose:
      "We moved to our current showroom on Spartanburg Hwy. Customers come in, sit on the frames, feel the mattresses, and meet the people who will answer the phone if anything ever goes sideways. We prefer it that way.",
    accent: "◇",
    accentLabel: "showroom marker",
  },
  {
    year: "Now",
    eyebrow: "Today",
    heading: "Still here, still the same",
    prose:
      "Three decades later, the same family runs the same shop. We've expanded the catalog, improved the website, and added online ordering — but the job hasn't changed: help you choose well and stand behind every piece we sell.",
    accent: "◆",
    accentLabel: "today marker",
  },
] as const;

const REVEAL = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.55, ease: "easeOut" as const },
};

const REVEAL_ACCENT = {
  initial: { opacity: 0, scale: 0.8 },
  whileInView: { opacity: 1, scale: 1 },
  viewport: { once: true, amount: 0.5 },
  transition: { duration: 0.4, ease: "easeOut" as const },
};

export function ScrollStory() {
  const reduce = useReducedMotion() ?? false;

  return (
    <section
      aria-labelledby="scroll-story-heading"
      data-slot="scroll-story"
      className="space-y-0"
    >
      <h2
        id="scroll-story-heading"
        className="sr-only"
      >
        Three decades, four waypoints
      </h2>

      {CHAPTERS.map((ch, i) => (
        <div
          key={ch.year}
          data-slot={`scroll-chapter-${i}`}
          className="grid grid-cols-[64px_1fr] gap-x-6 sm:grid-cols-[88px_1fr] sm:gap-x-8 py-10 border-t border-cf-sand first:border-t-0"
        >
          {/* Sticky year badge — sticks on left while chapter prose scrolls */}
          <div className="sticky top-24 self-start">
            <m.span
              data-slot="chapter-year"
              aria-hidden="true"
              className="font-playfair text-2xl font-semibold text-cf-sand sm:text-3xl leading-none tabular-nums"
              {...(reduce ? {} : { ...REVEAL_ACCENT, transition: { ...REVEAL_ACCENT.transition, delay: 0.05 } })}
            >
              {ch.year}
            </m.span>
          </div>

          {/* Chapter content — reveals on scroll */}
          <div className="space-y-3 min-h-[6rem]">
            <m.div
              {...(reduce ? {} : { ...REVEAL, transition: { ...REVEAL.transition, delay: 0.1 * i } })}
            >
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
                {ch.eyebrow}
              </p>
              <h3 className="font-playfair text-xl font-semibold tracking-tight text-cf-espresso mt-1 sm:text-2xl">
                {ch.heading}
              </h3>
            </m.div>

            <m.p
              className="leading-relaxed text-cf-ink/90"
              {...(reduce ? {} : { ...REVEAL, transition: { ...REVEAL.transition, delay: 0.1 * i + 0.12 } })}
            >
              {ch.prose}
            </m.p>

            <m.span
              aria-label={ch.accentLabel}
              className="inline-block text-cf-cta/40 text-lg mt-1 select-none"
              {...(reduce ? {} : { ...REVEAL_ACCENT, transition: { ...REVEAL_ACCENT.transition, delay: 0.1 * i + 0.22 } })}
            >
              {ch.accent}
            </m.span>
          </div>
        </div>
      ))}
    </section>
  );
}
