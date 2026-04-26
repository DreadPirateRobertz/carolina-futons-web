"use client";

import { m, useReducedMotion } from "framer-motion";
import Link from "next/link";

// Closing CTA — premium, centered, minimal. No distractions from the ask.
export function SeacatCta() {
  const reduce = useReducedMotion() ?? true;

  return (
    <section
      aria-label="Visit us"
      className="relative overflow-hidden bg-sc-slate py-32"
    >
      {/* Gold border top */}
      <div
        aria-hidden="true"
        className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-sc-gold/50 to-transparent"
      />

      {/* Subtle centered radial glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(201,168,76,0.06),transparent)]"
      />

      <m.div
        initial={reduce ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative mx-auto max-w-2xl px-6 text-center sm:px-10"
      >
        <p className="text-[0.65rem] font-medium uppercase tracking-[0.35em] text-sc-gold/60">
          Hendersonville, NC
        </p>

        <h2 className="mt-6 font-heading text-4xl font-bold leading-tight text-sc-cream sm:text-5xl">
          Come sit on something.
        </h2>

        <div
          aria-hidden="true"
          className="mx-auto mt-8 h-px w-16 bg-sc-gold/60"
        />

        <p className="mt-8 text-base leading-relaxed text-sc-muted">
          The showroom is open Wednesday through Saturday, 10&nbsp;am–5&nbsp;pm.
          Walk-ins welcome. No pressure, no commission. Just good frames.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/visit"
            className="inline-flex h-12 items-center gap-2 border border-sc-gold px-8 text-sm font-medium tracking-wide text-sc-gold transition-colors hover:bg-sc-gold hover:text-sc-slate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sc-gold focus-visible:ring-offset-2 focus-visible:ring-offset-sc-slate"
          >
            Plan your visit
          </Link>
          <Link
            href="/shop"
            className="inline-flex h-12 items-center gap-2 px-8 text-sm font-medium tracking-wide text-sc-muted transition-colors hover:text-sc-cream focus-visible:outline-none"
          >
            Shop online →
          </Link>
        </div>

        <p className="mt-10 text-xs text-sc-muted/60">
          321 N. Main St., Hendersonville, NC 28792 &middot; 15 min south of Asheville
        </p>
      </m.div>

      {/* Gold border bottom */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sc-gold/30 to-transparent"
      />
    </section>
  );
}
