"use client";

import { m, useReducedMotion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";

// Full-bleed dark slate hero with scroll-driven parallax. As the user scrolls
// the hero off-screen the copy gently rises and fades — giving a sense of
// depth before the chapters section pins in. Parallax is disabled for
// prefers-reduced-motion (the copy becomes static but still readable).
export function SeacatHero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion() ?? true;

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative flex min-h-screen items-center overflow-hidden bg-sc-slate"
    >
      {/* Subtle radial glow — suggests depth without being decorative noise */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_30%_40%,rgba(201,168,76,0.07),transparent)]"
      />

      {/* Top gold rule */}
      <div
        aria-hidden="true"
        className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-sc-gold/60 to-transparent"
      />

      <m.div
        style={reduce ? {} : { y, opacity }}
        className="relative z-10 mx-auto w-full max-w-6xl px-6 py-32 sm:px-10 lg:px-16"
      >
        <p className="text-[0.65rem] font-medium uppercase tracking-[0.35em] text-sc-gold/70">
          Family owned · Hendersonville, NC · Est.&nbsp;1991
        </p>

        <h1 className="mt-8 font-heading text-[clamp(3rem,8vw,6.5rem)] font-bold leading-[0.95] tracking-tight text-sc-cream">
          Crafted<br />
          to outlive<br />
          <em className="text-sc-gold not-italic">the&nbsp;room.</em>
        </h1>

        {/* Gold rule */}
        <div
          aria-hidden="true"
          className="mt-10 h-px w-20 bg-sc-gold"
        />

        <m.p
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease: "easeOut" }}
          className="mt-10 max-w-lg text-lg leading-relaxed text-sc-cream/65"
        >
          Solid hardwood frames, American-made since 1991. The same hands
          that built the first frame are still at the bench.
        </m.p>

        <m.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.55, ease: "easeOut" }}
          className="mt-12 flex flex-wrap gap-4"
        >
          <Link
            href="/shop"
            className="inline-flex h-12 items-center gap-2 border border-sc-gold px-8 text-sm font-medium tracking-wide text-sc-gold transition-colors hover:bg-sc-gold hover:text-sc-slate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sc-gold focus-visible:ring-offset-2 focus-visible:ring-offset-sc-slate"
          >
            Explore the collection
          </Link>
          <Link
            href="/visit"
            className="inline-flex h-12 items-center gap-2 px-8 text-sm font-medium tracking-wide text-sc-muted transition-colors hover:text-sc-cream focus-visible:outline-none"
          >
            Visit the showroom →
          </Link>
        </m.div>
      </m.div>

      {/* Bottom fade into chapters section */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-sc-slate to-transparent"
      />
    </section>
  );
}
