import type { Metadata } from "next";

import { BUSINESS } from "@/lib/business/contact-info";

export const metadata: Metadata = {
  title: "Shipping — Carolina Futons",
  description:
    "How Carolina Futons ships frames, mattresses, and Murphy beds — lead times, carriers, and in-home delivery options.",
};

export default function ShippingPage() {
  return (
    <main className="mx-auto w-full px-4 py-12 sm:px-6 sm:py-16">
      <article className="mx-auto max-w-[65ch] space-y-8 font-source-sans text-cf-ink">
        <header className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
            Policies
          </p>
          <h1 className="font-playfair text-4xl font-semibold tracking-tight sm:text-5xl">
            Shipping
          </h1>
          <p className="text-lg leading-relaxed text-cf-muted">
            We’ve been shipping futons since {BUSINESS.foundedYear}. Here’s
            what to expect from order confirmation to delivery.
          </p>
        </header>

        <section aria-labelledby="shipping-lead-times" className="space-y-4">
          <h2
            id="shipping-lead-times"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            Lead times
          </h2>
          <p className="leading-relaxed">
            Most in-stock frames and mattresses ship within two to four
            business days. Made-to-order items — custom covers, specific stain
            finishes, and configured Murphy beds — typically ship in two to
            four weeks. Your order confirmation email lists the expected ship
            window for each line item.
          </p>
        </section>

        <section aria-labelledby="shipping-carriers" className="space-y-4">
          <h2
            id="shipping-carriers"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            Carriers and transit
          </h2>
          <p className="leading-relaxed">
            Smaller items ship via UPS Ground. Frames, mattresses, and Murphy
            beds ship via common carrier freight — the driver will call ahead
            to schedule a delivery window. Transit time from Hendersonville,
            NC is typically two to seven business days for the continental US.
          </p>
        </section>

        <section aria-labelledby="shipping-in-home" className="space-y-4">
          <h2
            id="shipping-in-home"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            In-home delivery
          </h2>
          <p className="leading-relaxed">
            For an additional fee you can upgrade to room-of-choice delivery,
            which brings the item inside and places it where you’d like. White-
            glove service adds unboxing, assembly, and packaging removal. Both
            options appear at checkout for eligible products and ZIP codes.
          </p>
        </section>

        <section aria-labelledby="shipping-local" className="space-y-4">
          <h2
            id="shipping-local"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            Local delivery and pickup
          </h2>
          <p className="leading-relaxed">
            Within 60 miles of {BUSINESS.city}, {BUSINESS.state} we offer our
            own in-home delivery with a two-hour window, usually within the
            week. You’re also welcome to pick up at the showroom at{" "}
            {BUSINESS.street} — we’ll help you load.
          </p>
        </section>

        <section aria-labelledby="shipping-questions" className="space-y-4">
          <h2
            id="shipping-questions"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            Questions?
          </h2>
          <p className="leading-relaxed">
            Call us at{" "}
            <a
              href={BUSINESS.phoneHref}
              className="text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
            >
              {BUSINESS.phone}
            </a>{" "}
            or email{" "}
            <a
              href={BUSINESS.emailHref}
              className="text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
            >
              {BUSINESS.email}
            </a>
            . A real person will answer.
          </p>
        </section>
      </article>
    </main>
  );
}
