import type { Metadata } from "next";
import { CtaButton } from "@/components/ui/cta-button";

import { FeaturedProducts } from "@/components/site/FeaturedProducts";
import { VintageSunRays } from "@/components/mascot/VintageSunRays";
import { NewsletterSignup } from "@/components/site/NewsletterSignup";
import { findCategory } from "@/lib/shop/categories";
import { resolveDerivedProducts } from "@/lib/shop/derived-products";
import { getLandingBySlug } from "@/lib/wix/cf3qt";
import { DEFAULT_OG_IMAGE } from "@/lib/og";
import { twitterFromOpenGraph } from "@/lib/seo/twitter-from-og";

// cf-3qt.5.2: /spring-sale marketing landing.
// cf-yu2l.F1: hero copy + CTAs read from the `Landings` Wix-Data collection
// (slug="spring-sale") so marketing can edit without a deploy.
// Per-field fallback to the hardcoded literals below — until blaidd seeds
// the Landings collection, getLandingBySlug returns null and the render is
// byte-identical to the pre-cf-yu2l.F1 page. A Wix outage / parse error is
// swallowed so a data-layer failure cannot 500 the promo.
//
// Composes the existing primitives — derived "mattresses-sale" PLP source,
// FeaturedProducts strip, NewsletterSignup, VintageSunRays band — into a hero +
// strip + capture format. No new product reader: reuses
// resolveDerivedProducts(category) so any change to the mattresses-sale
// filter logic flows through to this landing without a second code path.
//
// On a Wix outage the resolver returns {items: [], error: "…"} — we render
// the page with no strip rather than a misleading "no items on sale" copy
// (the {items, error?} contract documented in derived-products.ts).

const SPRING_SALE_FALLBACK = {
  headline: "Spring Sale on mattresses",
  subheadline:
    "Hendersonville, NC. American-made mattresses we actually sleep on, picked for the season and priced to move. Free local delivery on orders over $1,500.",
  ctaPrimaryLabel: "Shop the sale",
  ctaPrimaryHref: "/shop/mattresses-sale",
  ctaSecondaryLabel: "Browse all mattresses",
  ctaSecondaryHref: "/shop/mattresses",
} as const;

const SPRING_SALE_TITLE = "Spring Sale — Carolina Futons";
const SPRING_SALE_DESCRIPTION =
  "Mattress promotions running this season at Carolina Futons in Hendersonville, North Carolina. American-made comfort, 15-year frame warranty.";

const SPRING_SALE_OPEN_GRAPH = {
  title: SPRING_SALE_TITLE,
  description: SPRING_SALE_DESCRIPTION,
  url: "/spring-sale",
  type: "website" as const,
  images: [DEFAULT_OG_IMAGE],
};

export const metadata: Metadata = {
  title: SPRING_SALE_TITLE,
  description: SPRING_SALE_DESCRIPTION,
  alternates: { canonical: "/spring-sale" },
  openGraph: SPRING_SALE_OPEN_GRAPH,
  twitter: twitterFromOpenGraph(SPRING_SALE_OPEN_GRAPH),
};

export default async function SpringSalePage() {
  const saleCategory = findCategory("mattresses-sale");
  const [result, landing] = await Promise.all([
    saleCategory ? resolveDerivedProducts(saleCategory) : Promise.resolve(undefined),
    getLandingBySlug("spring-sale").catch(() => null),
  ]);
  const products = result?.items ?? [];
  // Distinguish a clean empty state from a Wix outage. We hide the strip in
  // either case (no carrying value to surface), but the outage path also
  // suppresses the "see all" link to /shop/mattresses-sale since that PLP
  // would render the same outage copy.
  const sourceOk = result ? !result.error : false;

  const headline = landing?.headline ?? SPRING_SALE_FALLBACK.headline;
  const subheadline = landing?.subheadline ?? SPRING_SALE_FALLBACK.subheadline;
  const ctaPrimaryLabel = landing?.ctaPrimaryLabel ?? SPRING_SALE_FALLBACK.ctaPrimaryLabel;
  const ctaPrimaryHref = landing?.ctaPrimaryHref ?? SPRING_SALE_FALLBACK.ctaPrimaryHref;
  const ctaSecondaryLabel = landing?.ctaSecondaryLabel ?? SPRING_SALE_FALLBACK.ctaSecondaryLabel;
  const ctaSecondaryHref = landing?.ctaSecondaryHref ?? SPRING_SALE_FALLBACK.ctaSecondaryHref;

  return (
    <main className="w-full">
      <section
        aria-labelledby="spring-sale-hero"
        className="relative overflow-hidden bg-cf-cream"
      >
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center md:py-24 lg:px-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-cf-cta">
              Limited time
            </p>
            <h1
              id="spring-sale-hero"
              className="mt-4 font-heading text-4xl font-bold uppercase leading-[1.05] tracking-tight text-cf-navy sm:text-5xl md:text-6xl"
            >
              {headline}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-cf-charcoal/80">
              {subheadline}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <CtaButton href={ctaPrimaryHref}>{ctaPrimaryLabel}</CtaButton>
              <CtaButton href={ctaSecondaryHref} variant="outline">{ctaSecondaryLabel}</CtaButton>
            </div>
          </div>
          <div data-slot="spring-sale-aside" className="hidden md:block">
            <VintageSunRays phase="dawn" />
          </div>
        </div>
      </section>

      {sourceOk && products.length > 0 ? (
        <FeaturedProducts products={products} />
      ) : null}

      <section
        aria-labelledby="spring-sale-capture"
        className="border-t border-cf-divider bg-cf-cream"
      >
        <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
          <h2
            id="spring-sale-capture"
            className="font-heading text-2xl font-semibold tracking-tight text-cf-navy sm:text-3xl"
          >
            Heads up when the next price drops
          </h2>
          <p className="mt-3 text-base text-cf-charcoal/80">
            One email per promotion — no daily blasts. Unsubscribe with one
            click any time.
          </p>
          <div className="mt-6">
            <NewsletterSignup />
          </div>
        </div>
      </section>
    </main>
  );
}
