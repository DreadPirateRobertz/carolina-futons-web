import type { Metadata } from "next";
import Link from "next/link";

import { BUSINESS } from "@/lib/business/contact-info";
import { CabinHero } from "@/components/mascot/CabinHero";
import { JsonLd } from "@/components/seo/JsonLd";
import { getSiteContent } from "@/lib/cms/site-content";
import {
  buildLocalBusinessSchema,
  resolveSiteUrl,
} from "@/lib/seo/json-ld";

export const metadata: Metadata = {
  title: "Visit Us — Carolina Futons",
  description:
    "Visit the Carolina Futons showroom in Hendersonville, NC. Try every futon, mattress, and Murphy bed before you buy.",
};

// Days are layout (the label column); only the hours string is owner-editable
// via SiteContent so seasonal closures don't need a deploy. Fallbacks below
// match the current published hours (Brenda's #475 schedule update) and are
// returned by getSiteContent any time the SiteContent collection is missing
// the row.
const STORE_HOURS_FALLBACK = [
  {
    key: "visit.hours.sun-tue",
    days: "Sunday – Tuesday",
    fallback: "10 am – 5 pm",
  },
  {
    key: "visit.hours.wed-sat",
    days: "Wednesday – Saturday",
    fallback: "Closed",
  },
] as const;

export default async function VisitPage() {
  const storeHours = await Promise.all(
    STORE_HOURS_FALLBACK.map(async ({ key, days, fallback }) => ({
      days,
      hours: await getSiteContent(key, fallback),
    })),
  );
  const fullAddress = `${BUSINESS.street}, ${BUSINESS.city}, ${BUSINESS.state} ${BUSINESS.zip}`;
  const mapsHref = `https://maps.google.com/?q=${encodeURIComponent(`${BUSINESS.name} ${fullAddress}`)}`;
  const siteUrl = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  const localBusinessSchema = buildLocalBusinessSchema(siteUrl);

  return (
    <main className="w-full">
      <JsonLd id="jsonld-visit-localbusiness" schema={localBusinessSchema} />
      <CabinHero className="max-h-72" />
      <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="font-heading text-4xl font-bold tracking-tight text-cf-navy sm:text-5xl">
          Visit Us
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-cf-charcoal/80">
          Come try it in person. Our Hendersonville showroom has every frame,
          mattress, and Murphy bed we sell — no commission pressure, just honest
          answers.
        </p>

        <div className="mt-12 grid gap-10 sm:grid-cols-2">
          {/* Location */}
          <section aria-labelledby="location-heading">
            <h2
              id="location-heading"
              className="font-heading text-xl font-semibold text-cf-navy"
            >
              Location
            </h2>
            <address className="mt-4 not-italic text-cf-charcoal/80">
              <p className="font-medium text-cf-ink">{BUSINESS.name}</p>
              <p>{BUSINESS.street}</p>
              <p>
                {BUSINESS.city}, {BUSINESS.state} {BUSINESS.zip}
              </p>
            </address>
            <div className="mt-4 space-y-1 text-sm text-cf-charcoal/80">
              <p>
                <span className="font-medium text-cf-ink">Call/Text: </span>
                <a
                  href={BUSINESS.phoneHref}
                  className="hover:underline"
                >
                  {BUSINESS.phone}
                </a>
              </p>
              <p>
                <span className="font-medium text-cf-ink">Email: </span>
                <a href={BUSINESS.emailHref} className="hover:underline">
                  {BUSINESS.email}
                </a>
              </p>
            </div>
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex h-10 items-center justify-center rounded-md border border-cf-navy px-5 text-sm font-medium text-cf-navy transition-colors hover:bg-cf-navy hover:text-cf-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Get directions
            </a>
          </section>

          {/* Hours */}
          <section aria-labelledby="hours-heading">
            <h2
              id="hours-heading"
              className="font-heading text-xl font-semibold text-cf-navy"
            >
              Store Hours
            </h2>
            <dl className="mt-4 space-y-2">
              {storeHours.map(({ days, hours }) => (
                <div key={days} className="flex justify-between text-sm">
                  <dt className="font-medium text-cf-ink">{days}</dt>
                  <dd className="text-cf-charcoal/80">{hours}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        {/* Map embed */}
        <div className="mt-12 overflow-hidden rounded-lg border border-cf-divider">
          <iframe
            title={`Map showing ${BUSINESS.name} location`}
            src={`https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}&output=embed`}
            width="100%"
            height="380"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="block"
          />
        </div>

        {/* CTA */}
        <div className="mt-12 rounded-lg border border-cf-divider bg-cf-sand/40 p-8 text-center">
          <h2 className="font-heading text-2xl font-semibold text-cf-navy">
            Ready to shop?
          </h2>
          <p className="mt-2 text-cf-charcoal/80">
            Browse online first, then come in and try everything.
          </p>
          <Link
            href="/shop"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-md bg-cf-cta px-8 text-sm font-medium text-white shadow-sm transition-colors hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Browse all products
          </Link>
        </div>
      </div>
    </main>
  );
}
