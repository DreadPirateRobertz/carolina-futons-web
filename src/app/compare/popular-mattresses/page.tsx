import type { Metadata } from "next";
import Link from "next/link";

import { CompareTable } from "@/components/compare/CompareTable";
import { COMPARE_MIN, type CompareProduct } from "@/lib/product/compare";
import { DEFAULT_OG_IMAGE } from "@/lib/og";
import { resolveSiteUrl } from "@/lib/seo/json-ld";
import { getProductBySlug } from "@/lib/wix/products";
import { twitterFromOpenGraph } from "@/lib/seo/twitter-from-og";

// cf-2m1 (cf-0t9.1): SEO-indexable curated comparison of the Mesa
// mattress line by firmness. Sister to /compare/popular-futons.
//
// WHY this slug set: the Mesa line is the canonical cfw futon mattress
// SKU set (cf. src/lib/product/mattress-bundle.ts) — 1000=Plush,
// 3000=Medium, 5000=Firm. Three slugs gives a meaningful comparison
// surface that maps to a real shopper question ("which firmness
// should I pick?") and a real long-tail SERP query.

const POPULAR_SLUGS: ReadonlyArray<string> = [
  "mesa-1000-mattress",
  "mesa-3000-mattress",
  "mesa-5000-mattress",
] as const;

const TITLE = "Compare Mesa Futon Mattresses — Plush vs Medium vs Firm";
const DESCRIPTION =
  "Side-by-side comparison of the Mesa 1000 (plush), Mesa 3000 (medium), and Mesa 5000 (firm) futon mattresses — natural fibers, made in the USA.";

const OPEN_GRAPH = {
  title: TITLE,
  description: DESCRIPTION,
  images: [DEFAULT_OG_IMAGE],
};

/**
 * Static metadata for /compare/popular-mattresses. Indexable + canonical
 * to itself. Matches /compare/popular-futons (cf-0t9) shape.
 */
export const metadata: Metadata = (() => {
  const siteUrl = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: `${siteUrl}/compare/popular-mattresses` },
    openGraph: OPEN_GRAPH,
    twitter: twitterFromOpenGraph(OPEN_GRAPH),
  };
})();

/**
 * Server-rendered curated comparison of the Mesa mattress line.
 * Fetches all 3 slugs in parallel, drops null results so a single
 * discontinued/unpublished slug doesn't blank the entire table.
 */
export default async function ComparePopularMattressesPage() {
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
          Compare Mesa futon mattresses
        </h1>
        <p className="text-base leading-relaxed text-cf-muted">
          Three firmness levels in the Mesa line, side by side. The Mesa
          1000 reads plush, the Mesa 3000 sits in the middle, and the
          Mesa 5000 is the firmest — all natural fibers, all
          American-made.
        </p>
      </header>

      {products.length >= COMPARE_MIN ? (
        <CompareTable products={products} slugs={POPULAR_SLUGS} />
      ) : (
        <PopularMattressesUnavailable />
      )}

      <p className="mt-10 text-sm text-cf-muted">
        Want a different set?{" "}
        <Link href="/shop/mattresses" className="text-cf-cta hover:underline">
          Browse all mattresses →
        </Link>
      </p>
    </main>
  );
}

/**
 * Graceful-degradation render for the rare case that fewer than
 * COMPARE_MIN of the curated mattress slugs resolve. Mirrors the
 * pattern in /compare/popular-futons.
 */
function PopularMattressesUnavailable() {
  return (
    <section
      data-slot="compare-popular-unavailable"
      className="rounded-md border border-cf-divider bg-cf-cream/40 p-6 dark:bg-cf-ink/10"
    >
      <p className="text-sm text-cf-ink dark:text-cf-cream">
        We couldn&rsquo;t load the comparison just now.{" "}
        <Link href="/shop/mattresses" className="text-cf-cta hover:underline">
          Browse all mattresses
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
