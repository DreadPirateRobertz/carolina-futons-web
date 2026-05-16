import type { Metadata } from "next";
import Link from "next/link";

import { CompareTable } from "@/components/compare/CompareTable";
import { COMPARE_MIN, type CompareProduct } from "@/lib/product/compare";
import { DEFAULT_OG_IMAGE } from "@/lib/og";
import { resolveSiteUrl } from "@/lib/seo/json-ld";
import { getProductBySlug } from "@/lib/wix/products";
import { twitterFromOpenGraph } from "@/lib/seo/twitter-from-og";

// cf-0t9 (cf-ruhm.7): SEO-indexable curated comparison page.
//
// /compare?slugs=… is robots:noindex (correct — arbitrary slug-tuple
// permutations aren't crawl-worthy). This canonical sub-route renders
// a fixed 3-frame comparison that IS index-worthy: "Compare the
// kingston, sedona, and alpine futon frames side by side" is the kind
// of long-tail SERP cfw can actually win.
//
// WHY this slug set: chosen from the video-catalog (src/lib/videos/
// catalog.ts) where each productSlug is paired with a confirmed
// existing-frame video — guarantees the slugs render rather than
// 404'ing the comparison rows. Marketing can edit POPULAR_SLUGS in
// place; sibling curated routes (e.g. /compare/popular-mattresses)
// would follow the same pattern.

const POPULAR_SLUGS: ReadonlyArray<string> = [
  "kingston-futon-frame",
  "sedona-futon-frame",
  "alpine-futon-frame",
] as const;

const TITLE = "Compare Popular Futon Frames — Kingston vs Sedona vs Alpine";
const DESCRIPTION =
  "Side-by-side comparison of the kingston, sedona, and alpine futon frames — solid hardwood, American-made, 15-year warranty.";

const OPEN_GRAPH = {
  title: TITLE,
  description: DESCRIPTION,
  images: [DEFAULT_OG_IMAGE],
};

/**
 * Static metadata for /compare/popular-futons. Indexable (robots NOT
 * set to noindex), with a canonical URL pointing at itself so the
 * dynamic /compare?slugs=… variant doesn't compete for SERP authority.
 */
export const metadata: Metadata = (() => {
  const siteUrl = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: `${siteUrl}/compare/popular-futons` },
    openGraph: OPEN_GRAPH,
    twitter: twitterFromOpenGraph(OPEN_GRAPH),
  };
})();

/**
 * Server-rendered curated comparison. Fetches each popular slug in
 * parallel, drops null results so a single discontinued/unpublished
 * slug doesn't blank the entire table (graceful degradation —
 * matches /compare page behaviour, cf. src/app/compare/page.tsx).
 */
export default async function ComparePopularFutonsPage() {
  const products = (
    await Promise.all(
      POPULAR_SLUGS.map((slug) => getProductBySlug(slug).catch(() => null)),
    )
  ).filter((p): p is NonNullable<typeof p> => p !== null) as CompareProduct[];

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 max-w-3xl space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-cf-cta">
          Buying guide
        </p>
        <h1 className="font-heading text-3xl font-semibold text-cf-ink dark:text-cf-cream sm:text-4xl">
          Compare popular futon frames
        </h1>
        <p className="text-base leading-relaxed text-cf-muted">
          Three of our most-shipped futon frames, side by side. Each one is
          solid hardwood, American-made, and backed by our 15-year frame
          warranty.
        </p>
      </header>

      {products.length >= COMPARE_MIN ? (
        <CompareTable products={products} slugs={POPULAR_SLUGS} />
      ) : (
        <PopularCompareUnavailable />
      )}

      <p className="mt-10 text-sm text-cf-muted">
        Want a different set?{" "}
        <Link href="/shop/futon-frames" className="text-cf-cta hover:underline">
          Browse all futon frames →
        </Link>
      </p>
    </main>
  );
}

/**
 * Graceful-degradation render for the rare case that fewer than
 * COMPARE_MIN of the curated slugs resolve (e.g. a transient Wix
 * outage on multiple slugs, or a catalog rename + missed manifest
 * update). Keeps the page indexable + useful instead of 500'ing.
 */
function PopularCompareUnavailable() {
  return (
    <section
      data-slot="compare-popular-unavailable"
      className="rounded-md border border-cf-divider bg-cf-cream/40 p-6 dark:bg-cf-ink/10"
    >
      <p className="text-sm text-cf-ink dark:text-cf-cream">
        We couldn&rsquo;t load the comparison just now.{" "}
        <Link href="/shop/futon-frames" className="text-cf-cta hover:underline">
          Browse all futon frames
        </Link>{" "}
        or{" "}
        <Link href="/compare" className="text-cf-cta hover:underline">
          build a custom comparison
        </Link>
        .
      </p>
    </section>
  );
}
