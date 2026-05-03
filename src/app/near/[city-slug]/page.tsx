import type { Metadata } from "next";
import Link from "next/link";

import { BUSINESS } from "@/lib/business/contact-info";
import { SEO_CITIES, getCityBySlug, proximityLine } from "@/lib/seo/cities";
import { JsonLd } from "@/components/seo/JsonLd";
import { resolveSiteUrl } from "@/lib/seo/json-ld";

// Return a real 404 for any slug that isn't in SEO_CITIES.
export const dynamicParams = false;

const SITE_URL = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

export async function generateStaticParams() {
  return SEO_CITIES.map((city) => ({ "city-slug": city.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ "city-slug": string }>;
}): Promise<Metadata> {
  const { "city-slug": slug } = await params;
  const city = getCityBySlug(slug);

  if (!city) {
    return { robots: { index: false } };
  }

  const title = `Futons & Murphy Beds Near ${city.name}, ${city.state} | Carolina Futons`;
  const description = `Shop quality futons and murphy beds near ${city.name}. Carolina Futons — ${city.distanceMiles === 0 ? "located in Hendersonville, NC" : `${city.distanceMiles} miles from ${city.name}`}. Free shipping on frames.`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/near/${slug}` },
  };
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ "city-slug": string }>;
}) {
  const { "city-slug": slug } = await params;
  const city = getCityBySlug(slug);

  if (!city) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FurnitureStore",
    name: BUSINESS.name,
    url: SITE_URL,
    telephone: BUSINESS.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS.street,
      addressLocality: BUSINESS.city,
      addressRegion: BUSINESS.state,
      postalCode: BUSINESS.zip,
      addressCountry: "US",
    },
    areaServed: {
      "@type": "City",
      name: city.name,
      containedInPlace: {
        "@type": "State",
        name: city.state === "NC" ? "North Carolina" : "South Carolina",
      },
    },
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <JsonLd schema={jsonLd} />

      <header className="mb-10 space-y-4">
        <h1 className="font-heading text-4xl font-semibold tracking-tight text-cf-ink sm:text-5xl">
          Futons &amp; Murphy Beds Near {city.name}, {city.state}
        </h1>
        <p className="text-lg leading-relaxed text-cf-ink/80">
          {proximityLine(city)} Carolina Futons has been crafting quality
          sleep solutions since {BUSINESS.foundedYear}.
        </p>
      </header>

      <section className="mb-10 space-y-4">
        <h2 className="font-heading text-2xl font-semibold text-cf-ink">
          Shop Our Collection
        </h2>
        <p className="text-cf-ink/80">
          Browse our full selection of American-made futon frames, murphy
          cabinet beds, and quality mattresses — all available with free
          shipping to {city.name}.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/shop"
            className="inline-flex items-center rounded-md bg-cf-cta px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cf-cta-hover"
          >
            Shop All Products
          </Link>
          <Link
            href="/shop/futon-frames"
            className="inline-flex items-center rounded-md border border-cf-divider px-5 py-2.5 text-sm font-medium text-cf-ink transition-colors hover:border-cf-cta hover:text-cf-cta"
          >
            Futon Frames
          </Link>
          <Link
            href="/shop/murphy-cabinet-beds"
            className="inline-flex items-center rounded-md border border-cf-divider px-5 py-2.5 text-sm font-medium text-cf-ink transition-colors hover:border-cf-cta hover:text-cf-cta"
          >
            Murphy Beds
          </Link>
        </div>
      </section>

      <section className="rounded-lg border border-cf-divider bg-cf-cream p-6">
        <h2 className="mb-3 font-heading text-xl font-semibold text-cf-ink">
          Visit Our Showroom
        </h2>
        <address className="not-italic leading-relaxed text-cf-ink/80">
          {BUSINESS.street}
          <br />
          {BUSINESS.city}, {BUSINESS.state} {BUSINESS.zip}
        </address>
        <p className="mt-2 text-sm text-cf-ink/70">Wed–Sat, 10am–5pm</p>
        {city.distanceMiles > 0 && (
          <p className="mt-2 text-sm text-cf-ink/70">
            Approximately {city.distanceMiles} miles from {city.name}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={BUSINESS.phoneHref}
            className="text-sm text-cf-cta underline-offset-4 hover:underline"
          >
            {BUSINESS.phone}
          </a>
        </div>
      </section>
    </main>
  );
}
