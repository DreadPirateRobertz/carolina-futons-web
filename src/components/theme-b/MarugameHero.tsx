// Theme B — Marugame Grid: typography-first hero.
// One oversized word fills most of the viewport. Everything else whispers.
// No client JS needed — pure server component.

import type React from "react";

export function MarugameHero(): React.ReactElement {
  return (
    <section
      aria-label="Hero"
      className="relative flex min-h-[100svh] flex-col justify-between overflow-hidden bg-cf-cream px-6 py-10 sm:px-10"
    >
      {/* Top label row */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-cf-charcoal/50">
          Carolina Futons
        </span>
        <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-cf-charcoal/50">
          Est. 1991
        </span>
      </div>

      {/* Oversized word — the entire visual statement */}
      <div className="-mx-2 sm:-mx-4" aria-hidden="true">
        <p
          className="select-none font-heading text-[clamp(88px,18vw,260px)] font-normal italic leading-none tracking-[-0.04em] text-cf-navy"
          style={{ lineHeight: "0.9" }}
        >
          SLEEP
        </p>
        <p
          className="select-none font-heading text-[clamp(88px,18vw,260px)] font-normal italic leading-none tracking-[-0.04em] text-cf-navy/15"
          style={{ lineHeight: "0.9" }}
        >
          WELL.
        </p>
      </div>

      {/* Bottom row — tagline + scroll cue */}
      <div className="flex items-end justify-between">
        <p className="max-w-[28ch] text-sm leading-relaxed text-cf-charcoal/60">
          Hardwood frames, honest mattresses, and the expertise of a family
          that&rsquo;s been doing this since 1991.
        </p>
        <span
          aria-hidden="true"
          className="text-[11px] font-medium uppercase tracking-[0.25em] text-cf-charcoal/40"
        >
          Scroll ↓
        </span>
      </div>

      {/* Thin bottom rule — visual anchor before the grid */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-px w-full bg-cf-navy/10"
      />
    </section>
  );
}
