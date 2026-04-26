import type React from "react";

export function MarugameHero(): React.ReactElement {
  return (
    <section
      aria-label="Hero"
      className="relative flex min-h-[100svh] flex-col justify-between overflow-hidden bg-cf-cream px-6 py-10 sm:px-10"
    >
      {/* Left vertical accent — Swiss-editorial structural anchor */}
      <div
        aria-hidden="true"
        className="absolute left-6 top-10 h-[58%] w-px bg-cf-navy/[0.07] sm:left-10"
      />

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
          className="select-none font-heading text-[clamp(88px,18vw,260px)] font-normal italic tracking-[-0.04em] text-cf-navy"
          style={{ lineHeight: "0.88" }}
        >
          SLEEP
        </p>
        {/* WELL. indented slightly right — cascade creates the stagger */}
        <p
          className="select-none font-heading text-[clamp(88px,18vw,260px)] font-normal italic tracking-[-0.04em] text-cf-navy/[0.12] pl-[0.05em]"
          style={{ lineHeight: "0.88" }}
        >
          WELL.
        </p>
      </div>

      {/* Bottom row — tagline + scroll cue */}
      <div className="flex items-end justify-between">
        <p className="max-w-[26ch] text-[13px] leading-relaxed tracking-[0.01em] text-cf-charcoal/55">
          Hardwood frames, honest mattresses, and the expertise of a family
          that&rsquo;s been doing this since 1991.
        </p>
        <div aria-hidden="true" className="flex flex-col items-end gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-cf-charcoal/35">
            Scroll
          </span>
          <div className="h-5 w-px bg-cf-navy/20" />
        </div>
      </div>

      {/* Thin bottom rule — visual anchor before the grid */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-px w-full bg-cf-navy/10"
      />
    </section>
  );
}
