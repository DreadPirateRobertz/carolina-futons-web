import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Press — Carolina Futons",
  description:
    "Press resources for Carolina Futons — a family-owned futon and natural-mattress retailer in Hendersonville, North Carolina, in business since 1991.",
};

const LAST_UPDATED = "April 18, 2026";

export default function PressPage() {
  return (
    <main className="mx-auto w-full px-4 py-12 sm:px-6 sm:py-16">
      <article className="mx-auto max-w-[65ch] space-y-8 font-source-sans text-cf-ink">
        <header className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
            Press
          </p>
          <h1 className="font-playfair text-4xl font-semibold tracking-tight sm:text-5xl">
            Press &amp; Media
          </h1>
          <p className="text-sm text-cf-muted">Last updated {LAST_UPDATED}</p>
        </header>

        <p className="text-lg leading-relaxed">
          Carolina Futons is a family-owned retailer of solid-wood futon
          frames and natural mattresses based in Hendersonville, North
          Carolina. We&rsquo;ve been in business since 1991 and back our
          frames with a 15-year warranty. If you&rsquo;re writing about
          small-space furniture, sustainable home goods, or the long-running
          independent retailers of Western North Carolina, we&rsquo;d be
          glad to help.
        </p>

        <section className="space-y-4">
          <h2 className="font-playfair text-2xl font-semibold tracking-tight">
            About the company
          </h2>
          <p className="leading-relaxed">
            Founded in 1991, Carolina Futons sells convertible futon frames,
            futon mattresses, and bedroom furniture from a single showroom
            in Hendersonville, North Carolina. We focus on solid-wood
            construction, natural fibers, and pieces that are built to be
            repaired rather than replaced — most of our frames carry a
            15-year warranty.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-playfair text-2xl font-semibold tracking-tight">
            Story angles we can speak to
          </h2>
          <p className="leading-relaxed">
            Small-space and apartment furniture, the case for buying
            furniture you can repair, what changed (and what didn&rsquo;t)
            for an independent retailer over thirty years in the same town,
            and the practical differences between cotton, wool, and
            innerspring futon mattresses.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-playfair text-2xl font-semibold tracking-tight">
            Press contact
          </h2>
          <p className="leading-relaxed">
            For interviews, product photography, or fact-checking, email{" "}
            <a
              href="mailto:hello@carolinafutons.com"
              className="text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
            >
              hello@carolinafutons.com
            </a>{" "}
            with your outlet, deadline, and what you&rsquo;re working on.
            We&rsquo;ll get back to you within one business day.
          </p>
          <p className="leading-relaxed">
            Showroom: 1611 Brevard Road, Hendersonville, NC 28791.
          </p>
        </section>
      </article>
    </main>
  );
}
