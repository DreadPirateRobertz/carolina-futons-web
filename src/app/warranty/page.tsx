import type { Metadata } from "next";

import { BUSINESS } from "@/lib/business/contact-info";

export const metadata: Metadata = {
  title: "Warranty — Carolina Futons",
  description: `The Carolina Futons ${BUSINESS.warrantyYears}-year warranty: what it covers, how to file a claim, and what we stand behind.`,
};

export default function WarrantyPage() {
  return (
    <main className="mx-auto w-full px-4 py-12 sm:px-6 sm:py-16">
      <article className="mx-auto max-w-[65ch] space-y-8 font-source-sans text-cf-ink">
        <header className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
            Policies
          </p>
          <h1 className="font-playfair text-4xl font-semibold tracking-tight sm:text-5xl">
            {BUSINESS.warrantyYears}-year warranty
          </h1>
          <p className="text-lg leading-relaxed text-cf-muted">
            We’ve been building futons since {BUSINESS.foundedYear}. Our frames
            are backed by a {BUSINESS.warrantyYears}-year warranty against
            manufacturing defects — the longest in the business.
          </p>
        </header>

        <section aria-labelledby="warranty-covers" className="space-y-4">
          <h2
            id="warranty-covers"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            What the warranty covers
          </h2>
          <p className="leading-relaxed">
            The {BUSINESS.warrantyYears}-year warranty covers manufacturing
            defects in frames under normal residential use — cracked joints,
            failed hardware, delaminated panels, or latch mechanisms that
            stop working. We’ll repair the frame, send replacement parts, or
            in cases where neither is practical, replace the piece.
          </p>
        </section>

        <section aria-labelledby="warranty-mattresses" className="space-y-4">
          <h2
            id="warranty-mattresses"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            Mattresses and covers
          </h2>
          <p className="leading-relaxed">
            Mattresses carry the manufacturer’s warranty from the original
            maker, which varies by model — typically ten years on our premium
            lines. Covers and accessories are warranted against manufacturing
            defects for one year.
          </p>
        </section>

        <section aria-labelledby="warranty-excludes" className="space-y-4">
          <h2
            id="warranty-excludes"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            What the warranty does not cover
          </h2>
          <p className="leading-relaxed">
            Normal wear, fabric fading, commercial or rental use, damage from
            moving or improper assembly, and modifications that weren’t
            performed by us. The warranty also doesn’t cover aesthetic
            variations in solid wood — grain, color, and knot character are
            features of real wood furniture, not defects.
          </p>
        </section>

        <section aria-labelledby="warranty-transfer" className="space-y-4">
          <h2
            id="warranty-transfer"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            Transferability
          </h2>
          <p className="leading-relaxed">
            The warranty applies to the original purchaser and is not
            transferable. Please hold onto your order confirmation — it’s the
            proof of purchase we need to honor a claim.
          </p>
        </section>

        <section aria-labelledby="warranty-claim" className="space-y-4">
          <h2
            id="warranty-claim"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            Filing a claim
          </h2>
          <p className="leading-relaxed">
            Email{" "}
            <a
              href={BUSINESS.emailHref}
              className="text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
            >
              {BUSINESS.email}
            </a>{" "}
            with your order number, a description of the issue, and photos if
            you can. We’ll respond within one business day and walk you
            through the next step. You can also reach us by phone at{" "}
            <a
              href={BUSINESS.phoneHref}
              className="text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
            >
              {BUSINESS.phone}
            </a>
            .
          </p>
        </section>
      </article>
    </main>
  );
}
