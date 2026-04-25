import type { Metadata } from "next";

import { AddressCheckForm } from "./AddressCheckForm";
import { LOCAL_ZONES } from "@/lib/delivery/local-zones";

export const metadata: Metadata = {
  title: "Getting It Home — Carolina Futons",
  description:
    "Check whether Carolina Futons delivers to your area. ZIP-based zone lookup with curbside and white-glove pricing for our four delivery tiers.",
};

// cf-3qt.4.4: Getting It Home page. Customer-facing distance/zone resolver
// that ports the Velo localZones data from sharedTokens.js + matchLocalZone
// helper. The page is a server component that renders the static zone copy;
// the AddressCheckForm child is a client component that hits the
// resolveDeliveryZone Server Action and renders the result.
export default function GettingItHomePage() {
  return (
    <main className="mx-auto w-full px-4 py-12 sm:px-6 sm:py-16">
      <article className="mx-auto max-w-3xl space-y-10 font-source-sans text-cf-ink">
        <header className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
            Delivery
          </p>
          <h1 className="font-playfair text-4xl font-semibold tracking-tight sm:text-5xl">
            Getting It Home
          </h1>
          <p className="text-lg leading-relaxed text-cf-muted">
            Carolina Futons runs its own truck-delivery network across the
            Southeast. Type in your ZIP and we&rsquo;ll tell you which zone
            you&rsquo;re in, what curbside and white-glove cost, and how long
            it takes.
          </p>
        </header>

        <section
          aria-labelledby="gih-form-heading"
          className="rounded-lg border border-cf-divider bg-white p-6"
        >
          <h2
            id="gih-form-heading"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            Check your address
          </h2>
          <p className="mt-2 text-sm text-cf-muted">
            Enter a 5-digit ZIP. State is optional — we&rsquo;ll infer it from
            the ZIP for the four states we cover (NC, SC, GA, TN, VA).
          </p>
          <div className="mt-6">
            <AddressCheckForm />
          </div>
        </section>

        <section aria-labelledby="gih-zones-heading" className="space-y-4">
          <h2
            id="gih-zones-heading"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            Our four delivery zones
          </h2>
          <ul className="space-y-3" data-slot="gih-zones-list">
            {LOCAL_ZONES.map((zone) => (
              <li
                key={zone.code}
                data-zone={zone.code}
                className="rounded-md border border-cf-divider bg-cf-cream p-4"
              >
                <p className="font-medium text-cf-espresso">{zone.name}</p>
                <p className="text-sm text-cf-espresso/80">
                  {zone.description}
                </p>
                <p className="mt-2 text-xs text-cf-muted">
                  Curbside ${zone.delivery} · White-glove $
                  {zone.whiteGlove} · {zone.deliveryDays} business days
                </p>
              </li>
            ))}
          </ul>
        </section>
      </article>
    </main>
  );
}
