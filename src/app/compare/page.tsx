import type { Metadata } from "next";
import Link from "next/link";

import { CompareTable } from "@/components/compare/CompareTable";
import {
  buildCompareTitle,
  COMPARE_MAX,
  COMPARE_MIN,
  parseCompareSlugs,
  shouldShowEmpty,
  type CompareProduct,
} from "@/lib/product/compare";
import { getProductBySlug } from "@/lib/wix/products";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await props.searchParams;
  const slugs = parseCompareSlugs(sp.slugs);
  if (slugs.length < COMPARE_MIN) {
    return { title: "Compare — Carolina Futons" };
  }
  const products = await fetchCompareProducts(slugs);
  return {
    title: buildCompareTitle(products),
    robots: { index: false, follow: true },
  };
}

async function fetchCompareProducts(
  slugs: ReadonlyArray<string>,
): Promise<CompareProduct[]> {
  const results = await Promise.all(
    slugs.map((slug) => getProductBySlug(slug).catch(() => null)),
  );
  // Drop nulls so a single bad slug doesn't blank the entire table.
  return results.filter((p): p is NonNullable<typeof p> => p !== null);
}

export default async function ComparePage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await props.searchParams;
  const slugs = parseCompareSlugs(sp.slugs);

  if (shouldShowEmpty(slugs)) {
    return <CompareEmptyState reason="too-few-slugs" />;
  }

  const products = await fetchCompareProducts(slugs);

  if (shouldShowEmpty(products)) {
    return <CompareEmptyState reason="products-not-found" />;
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-cf-cta">
          Side-by-side comparison
        </p>
        <h1 className="mt-2 font-heading text-2xl font-semibold text-cf-ink sm:text-3xl">
          Compare {products.length} {products.length === 1 ? "product" : "products"}
        </h1>
        <p className="mt-2 text-sm text-cf-muted">
          Rows highlighted where values differ.
        </p>
      </header>

      <CompareTable products={products} slugs={slugs} />

      <p className="mt-8 text-sm">
        <Link href="/shop" className="text-cf-cta hover:underline">
          &larr; Back to the shop
        </Link>
      </p>
    </main>
  );
}

function CompareEmptyState({
  reason,
}: {
  reason: "too-few-slugs" | "products-not-found";
}) {
  return (
    <main
      data-slot="compare-empty"
      data-reason={reason}
      className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6"
    >
      <h1 className="font-heading text-2xl font-semibold text-cf-ink">
        Pick {COMPARE_MIN}–{COMPARE_MAX} products to compare
      </h1>
      <p className="mt-3 text-sm text-cf-muted">
        {reason === "too-few-slugs"
          ? `Append product slugs to the URL like /compare?slugs=monterey-futon,asheville-daybed (up to ${COMPARE_MAX}).`
          : "We couldn't find those products. Try picking different ones from the shop."}
      </p>
      <p className="mt-6">
        <Link
          href="/shop"
          className="inline-flex h-10 items-center justify-center rounded-md bg-cf-cta px-5 text-sm font-medium text-white hover:bg-cf-cta/90"
        >
          Browse the shop
        </Link>
      </p>
    </main>
  );
}
