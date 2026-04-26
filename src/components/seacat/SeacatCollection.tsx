"use client";

import { m, useReducedMotion } from "framer-motion";
import Link from "next/link";

const COLLECTION = [
  {
    slug: "futon-frames",
    label: "Futon frames",
    description:
      "Oak, maple, cherry. Bifold and trifold. The frame that started it all.",
    accent: "I",
  },
  {
    slug: "murphy-beds",
    label: "Murphy cabinet beds",
    description:
      "Rooms that earn their square footage. Vertical hardwood engineering.",
    accent: "II",
  },
  {
    slug: "platform-beds",
    label: "Platform beds",
    description:
      "Low profile. Solid frame. Exactly as much bed as you need.",
    accent: "III",
  },
] as const;

export function SeacatCollection() {
  const reduce = useReducedMotion() ?? true;

  return (
    <section
      aria-label="Shop the collection"
      className="bg-sc-slate-mid py-24"
    >
      <div className="mx-auto max-w-6xl px-6 sm:px-10 lg:px-16">
        {/* Header */}
        <m.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex items-end justify-between gap-6"
        >
          <div>
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.35em] text-sc-gold/60">
              The collection
            </p>
            <h2 className="mt-3 font-heading text-3xl font-bold text-sc-cream sm:text-4xl">
              American-made frames
            </h2>
          </div>
          <Link
            href="/shop"
            className="hidden text-sm font-medium tracking-wide text-sc-gold/70 transition-colors hover:text-sc-gold sm:block"
          >
            View all →
          </Link>
        </m.div>

        {/* Collection tiles */}
        <ul className="mt-12 grid grid-cols-1 gap-px border border-sc-gold/10 sm:grid-cols-3">
          {COLLECTION.map((item, i) => (
            <li key={item.slug}>
              <m.div
                initial={reduce ? false : { opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: i * 0.12, ease: "easeOut" }}
              >
                <Link
                  href={`/shop/${item.slug}`}
                  className="group flex h-full flex-col gap-6 border border-sc-gold/10 bg-sc-slate p-8 transition-colors hover:border-sc-gold/40 hover:bg-sc-slate-mid"
                >
                  <span
                    aria-hidden="true"
                    className="font-heading text-6xl font-bold leading-none text-sc-gold/15 group-hover:text-sc-gold/25 transition-colors"
                  >
                    {item.accent}
                  </span>
                  <div className="flex flex-1 flex-col gap-3">
                    <h3 className="font-heading text-xl font-semibold text-sc-cream">
                      {item.label}
                    </h3>
                    <p className="text-sm leading-relaxed text-sc-muted">
                      {item.description}
                    </p>
                  </div>
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-sc-gold/60 group-hover:text-sc-gold transition-colors">
                    Shop {item.label.toLowerCase()} →
                  </span>
                </Link>
              </m.div>
            </li>
          ))}
        </ul>

        <Link
          href="/shop"
          className="mt-8 block text-center text-sm font-medium tracking-wide text-sc-gold/60 hover:text-sc-gold sm:hidden"
        >
          View all products →
        </Link>
      </div>
    </section>
  );
}
