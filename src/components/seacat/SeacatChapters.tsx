"use client";

import { m, useReducedMotion } from "framer-motion";

// Company history timeline. The year label is `position: sticky` within each
// tall chapter block — it pins at the top of the viewport as the chapter
// content scrolls past. This gives the "sticky chapters" reading experience
// without JavaScript scroll listeners: pure CSS + scroll margin.
//
// Content reveals use whileInView so each milestone animates in as it enters
// the viewport, regardless of scroll speed. Reduced-motion users get the
// final state immediately (opacity/translate don't fire).
const CHAPTERS = [
  {
    year: "1991",
    headline: "The first showroom",
    body: "A single room on Main Street, Hendersonville. Three frames on the floor, one family behind the counter. The belief: furniture should outlive the apartment it ships to.",
    note: "Est. April 1991",
  },
  {
    year: "1998",
    headline: "Murphy beds join the lineup",
    body: "Rooms that earn their square footage. The wall bed became our second signature — the same hardwood joinery, now vertical.",
    note: "First Murphy delivery: Asheville, NC",
  },
  {
    year: "2007",
    headline: "The first online orders ship",
    body: "Carolina frames reach every corner of the continental US. The packing department runs out of tape twice on the first week.",
    note: "Over 300 orders in year one",
  },
  {
    year: "2014",
    headline: "Strata wall-hugger conversion",
    body: "Our frames adopt the Strata reclining mechanism — the most ergonomic futon-to-sofa conversion on the market. Form follows function, finally.",
    note: "Mechanism patent 2014",
  },
  {
    year: "2024",
    headline: "35,000 frames",
    body: "Thirty-five thousand frames delivered. The craftsmen who built the first one still clock in at the same bench. That is not a metaphor.",
    note: "35,000+ frames delivered nationwide",
  },
  {
    year: "2026",
    headline: "Still here. Still handmade.",
    body: "The showroom still smells like fresh-cut oak. We're still open Wednesday through Saturday. Come sit on something.",
    note: "Open Wed–Sat · 10 am–5 pm",
  },
] as const;

export function SeacatChapters() {
  const reduce = useReducedMotion() ?? true;

  return (
    <section
      aria-label="Company history"
      className="bg-sc-slate"
    >
      {/* Section header */}
      <div className="mx-auto max-w-6xl border-t border-sc-gold/20 px-6 pb-0 pt-20 sm:px-10 lg:px-16">
        <p className="text-[0.65rem] font-medium uppercase tracking-[0.35em] text-sc-gold/60">
          The record
        </p>
        <h2 className="mt-4 font-heading text-3xl font-bold text-sc-cream sm:text-4xl">
          1991&ndash;2026
        </h2>
      </div>

      {/* Chapters */}
      <div className="mx-auto max-w-6xl px-6 sm:px-10 lg:px-16">
        {CHAPTERS.map((chapter) => (
          <article
            key={chapter.year}
            // Each article is tall enough for the year to pin meaningfully.
            // min-h-[60vh] gives ~half-a-viewport of "stick time" per chapter.
            className="relative grid min-h-[60vh] grid-cols-1 gap-8 border-t border-sc-gold/10 py-16 sm:grid-cols-[160px_1fr] sm:gap-16 lg:grid-cols-[220px_1fr]"
          >
            {/* Sticky year label — pins at top of viewport inside this article */}
            <div className="sm:sticky sm:top-28 sm:h-fit">
              <span
                className="font-heading text-5xl font-bold leading-none tracking-tight text-sc-gold/30 sm:text-6xl"
                aria-label={`Year ${chapter.year}`}
              >
                {chapter.year}
              </span>
            </div>

            {/* Scrolling content — animates in when the article enters viewport */}
            <m.div
              initial={reduce ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.65, ease: "easeOut" }}
              className="flex flex-col justify-center"
            >
              <h3 className="font-heading text-2xl font-semibold text-sc-cream sm:text-3xl">
                {chapter.headline}
              </h3>
              <p className="mt-4 max-w-prose text-base leading-relaxed text-sc-muted">
                {chapter.body}
              </p>
              <p className="mt-6 text-xs font-medium uppercase tracking-[0.2em] text-sc-gold/50">
                {chapter.note}
              </p>
            </m.div>
          </article>
        ))}
      </div>

      {/* Bottom gold rule */}
      <div
        aria-hidden="true"
        className="mx-auto max-w-6xl border-t border-sc-gold/20 px-6 sm:px-10 lg:px-16"
      />
    </section>
  );
}
