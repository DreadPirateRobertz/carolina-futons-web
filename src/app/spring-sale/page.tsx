import { cache } from "react";

import type { Metadata } from "next";
import { CtaButton } from "@/components/ui/cta-button";

import { FeaturedProducts } from "@/components/site/FeaturedProducts";
import { VintageSunRays } from "@/components/mascot/VintageSunRays";
import { NewsletterSignup } from "@/components/site/NewsletterSignup";
import { findCategory } from "@/lib/shop/categories";
import { resolveDerivedProducts } from "@/lib/shop/derived-products";
import { getLandingBySlug, type Landing } from "@/lib/wix/cf3qt";
import { DEFAULT_OG_IMAGE } from "@/lib/og";
import { twitterFromOpenGraph } from "@/lib/seo/twitter-from-og";

// cf-yu2l.F1 v2 (self-CR fold): editor-saved empty strings ("") on a
// Landing field should fall back to the hardcoded literal, not ship as
// an empty h1 / empty description meta. Plain `??` doesn't coalesce
// "" — only null / undefined. Helper does both.
function coalesce(value: string | null | undefined, fallback: string): string {
  if (value === undefined || value === null) return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

// cf-yu2l.F1 v2: dedupe the Landings fetch across page body +
// generateMetadata. Next.js calls generateMetadata and the default
// export independently — without React.cache they each round-trip to
// Wix Stores. cache() memoizes per-request so the SDK fires once.
const fetchSpringSaleLanding = cache(
  async (): Promise<Landing | null> =>
    getLandingBySlug("spring-sale").catch(() => null),
);

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

// cf-yu2l.F1.2: generateMetadata also reads Landings so <title>, description,
// and the og:image follow the editor without a redeploy. v2 fold: uses
// fetchSpringSaleLanding (React.cache) to dedupe with the page body's
// fetch; coalesce() rejects editor-saved empty strings.
//
// The Landing-driven ogImage path mirrors DEFAULT_OG_IMAGE's width/height
// (1200×630 — standard social-card aspect) so crawlers can pre-size both
// paths without a fetch. Editors who upload non-1200×630 images will
// produce visually off-center cards but the dimensions hint stays
// consistent — follow-on bead can wire per-Landing dimensions if Wix
// ever exposes them.
const LANDING_OG_DIMENSIONS = { width: 1200, height: 630 } as const;

export async function generateMetadata(): Promise<Metadata> {
  const landing = await fetchSpringSaleLanding();
  const description = coalesce(landing?.seoDescription, SPRING_SALE_DESCRIPTION);
  const landingOgUrl = coalesce(landing?.ogImageUrl, "");
  const ogImage = landingOgUrl
    ? { url: landingOgUrl, ...LANDING_OG_DIMENSIONS }
    : DEFAULT_OG_IMAGE;
  const openGraph = {
    title: SPRING_SALE_TITLE,
    description,
    url: "/spring-sale",
    type: "website" as const,
    images: [ogImage],
  };
  return {
    title: SPRING_SALE_TITLE,
    description,
    alternates: { canonical: "/spring-sale" },
    openGraph,
    twitter: twitterFromOpenGraph(openGraph),
  };
}

export default async function SpringSalePage() {
  const saleCategory = findCategory("mattresses-sale");
  const [result, landing] = await Promise.all([
    saleCategory ? resolveDerivedProducts(saleCategory) : Promise.resolve(undefined),
    // cf-yu2l.F1 v2: shared via React.cache with generateMetadata —
    // one round-trip per request, not two.
    fetchSpringSaleLanding(),
  ]);
  const products = result?.items ?? [];
  // Distinguish a clean empty state from a Wix outage. We hide the strip in
  // either case (no carrying value to surface), but the outage path also
  // suppresses the "see all" link to /shop/mattresses-sale since that PLP
  // would render the same outage copy.
  const sourceOk = result ? !result.error : false;

  // cf-yu2l.F1 v2: coalesce() rejects editor-saved empty strings — see
  // helper docstring. Plain `??` would ship an empty h1 if marketing
  // clears a field, which is worse than the hardcoded fallback.
  const headline = coalesce(landing?.headline, SPRING_SALE_FALLBACK.headline);
  const subheadline = coalesce(landing?.subheadline, SPRING_SALE_FALLBACK.subheadline);
  const ctaPrimaryLabel = coalesce(landing?.ctaPrimaryLabel, SPRING_SALE_FALLBACK.ctaPrimaryLabel);
  const ctaPrimaryHref = coalesce(landing?.ctaPrimaryHref, SPRING_SALE_FALLBACK.ctaPrimaryHref);
  const ctaSecondaryLabel = coalesce(landing?.ctaSecondaryLabel, SPRING_SALE_FALLBACK.ctaSecondaryLabel);
  const ctaSecondaryHref = coalesce(landing?.ctaSecondaryHref, SPRING_SALE_FALLBACK.ctaSecondaryHref);

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
