import type { Metadata } from "next";
import { CtaButton } from "@/components/ui/cta-button";

import { FeaturedProducts } from "@/components/site/FeaturedProducts";
import { VintageSunRays } from "@/components/mascot/VintageSunRays";
import { NewsletterSignup } from "@/components/site/NewsletterSignup";
import { findCategory } from "@/lib/shop/categories";
import { resolveDerivedProducts } from "@/lib/shop/derived-products";
import { twitterFromOpenGraph } from "@/lib/seo/twitter-from-og";

// cf-3qt.5.2: /spring-sale marketing landing.
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

const OPEN_GRAPH = {
  title: "Spring Sale — Carolina Futons",
  description:
    "Mattress promotions running this season — American-made comfort from Hendersonville, NC.",
};

export const metadata: Metadata = {
  title: "Spring Sale — Carolina Futons",
  description:
    "Mattress promotions running this season at Carolina Futons in Hendersonville, North Carolina. American-made comfort, 15-year frame warranty.",
  openGraph: OPEN_GRAPH,
  twitter: twitterFromOpenGraph(OPEN_GRAPH),
};

export default async function SpringSalePage() {
  const saleCategory = findCategory("mattresses-sale");
  const result = saleCategory
    ? await resolveDerivedProducts(saleCategory)
    : undefined;
  const products = result?.items ?? [];
  // Distinguish a clean empty state from a Wix outage. We hide the strip in
  // either case (no carrying value to surface), but the outage path also
  // suppresses the "see all" link to /shop/mattresses-sale since that PLP
  // would render the same outage copy.
  const sourceOk = result ? !result.error : false;

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
              className="mt-4 font-heading text-4xl font-bold uppercase leading-[1.05] tracking-tight text-cf-navy dark:text-cf-cream sm:text-5xl md:text-6xl"
            >
              Spring Sale on mattresses
            </h1>
            <p className="mt-5 max-w-xl text-lg text-cf-charcoal/80 dark:text-cf-cream/80">
              Hendersonville, NC. American-made mattresses we actually sleep on,
              picked for the season and priced to move. Free local delivery on
              orders over $1,500.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <CtaButton href="/shop/mattresses-sale">Shop the sale</CtaButton>
              <CtaButton href="/shop/mattresses" variant="outline">Browse all mattresses</CtaButton>
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
            className="font-heading text-2xl font-semibold tracking-tight text-cf-navy sm:text-3xl dark:text-cf-cream"
          >
            Heads up when the next price drops
          </h2>
          <p className="mt-3 text-base text-cf-charcoal/80 dark:text-cf-cream/80">
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
