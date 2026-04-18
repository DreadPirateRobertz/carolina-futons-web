import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCollectionBySlug } from "@/lib/wix/products";
import { getCollectionPlp, type PlpSort } from "@/lib/wix/plp";
import { SHOP_CATEGORIES, findCategory } from "@/lib/shop/categories";
import { resolveDerivedProducts } from "@/lib/shop/derived-products";
import { ProductCard } from "@/components/product/ProductCard";
import { PLPControls } from "@/components/plp/PLPControls";
import { PLPPagination, buildPageUrl } from "@/components/plp/PLPPagination";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return SHOP_CATEGORIES.map((category) => ({ category: category.slug }));
}

export async function generateMetadata(props: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: categorySlug } = await props.params;
  const category = findCategory(categorySlug);
  if (!category) return { title: "Shop — Carolina Futons" };
  return {
    title: `${category.name} — Carolina Futons`,
    description: category.description,
  };
}

const VALID_SORTS = new Set<PlpSort>([
  "featured",
  "price-asc",
  "price-desc",
  "name-asc",
  "name-desc",
  "newest",
]);

export function parseSearchParams(
  sp: Record<string, string | string[] | undefined>,
) {
  const raw = (key: string) =>
    Array.isArray(sp[key])
      ? (sp[key] as string[])[0]
      : (sp[key] as string | undefined);

  const pageNum = Math.max(1, parseInt(raw("page") ?? "1", 10) || 1);
  const rawSort = raw("sort") ?? "featured";
  const sort: PlpSort = VALID_SORTS.has(rawSort as PlpSort)
    ? (rawSort as PlpSort)
    : "featured";
  const parsePrice = (v: string | undefined) => {
    const n = v !== undefined ? Number(v) : NaN;
    return Number.isFinite(n) ? n : undefined;
  };
  const priceMin = parsePrice(raw("priceMin"));
  const priceMax = parsePrice(raw("priceMax"));
  const inStockOnly = raw("inStock") === "1";

  return { pageNum, sort, priceMin, priceMax, inStockOnly };
}

export default async function PlpPage(props: {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ category: categorySlug }, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ]);

  const category = findCategory(categorySlug);
  if (!category) notFound();

  // Derived categories (category.filter set) skip the collection lookup — their
  // products come from resolveDerivedProducts sourcing a different collection
  // and applying the predicate. Regular categories fetch their own collection.
  const [collection, prefetchedProducts] = await Promise.all([
    category.filter ? null : getCollectionBySlug(category.collectionSlug),
    resolveDerivedProducts(category),
  ]);

  const { pageNum, sort, priceMin, priceMax, inStockOnly } =
    parseSearchParams(searchParams);

  // Use collection ID when available; fall back to "" for derived categories
  // where getCollectionPlp will use prefetchedProducts instead.
  const { page, facets } =
    collection?._id || prefetchedProducts !== undefined
      ? await getCollectionPlp(collection?._id ?? "", {
          page: pageNum,
          pageSize: 24,
          sort,
          filters: { priceMin, priceMax, inStockOnly: inStockOnly || undefined },
          prefetchedProducts: prefetchedProducts
            ? [...prefetchedProducts]
            : undefined,
        })
      : {
          page: {
            items: [],
            total: 0,
            page: 1,
            pageSize: 24,
            hasNext: false,
            hasPrev: false,
          },
          facets: {
            total: 0,
            inStock: 0,
            outOfStock: 0,
            priceBuckets: [],
          },
        };

  // cf-3qt.6.B silent-failure fix (blaidd PR #35): an errored scan returns
  // items=[] but it is NOT an empty collection. We MUST render distinct outage
  // copy rather than "No products found" to avoid a bounce trap during Wix
  // outages (silent-failure review required an explicit branch).
  const readerFailed = page.error !== undefined;

  const basePath = `/shop/${categorySlug}`;

  // cf-3qt.6.B.1: page=N beyond the last filled page returns items=[] while
  // page.total > 0 — this is NOT "no matches", the user is over-paginated.
  // Offer a back-to-page-1 link that preserves sort + filter params.
  const overPaginated =
    pageNum > 1 && page.total > 0 && page.items.length === 0;
  const backToPageOneHref = overPaginated
    ? buildPageUrl(basePath, searchParams, 1)
    : undefined;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <nav className="text-sm text-zinc-500">
        <Link href="/shop" className="hover:underline">
          Shop
        </Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-900">{category.name}</span>
      </nav>

      <header className="mt-4">
        <h1 className="text-3xl font-semibold tracking-tight">
          {category.name}
        </h1>
        <p className="mt-2 text-zinc-600">{category.description}</p>
      </header>

      <div className="mt-6">
        <Suspense>
          <PLPControls
            sort={sort}
            priceMin={priceMin}
            priceMax={priceMax}
            inStockOnly={inStockOnly}
            totalFiltered={page.total}
          />
        </Suspense>
      </div>

      {readerFailed ? (
        <p
          role="alert"
          className="mt-10 rounded-md border border-amber-200 bg-amber-50 p-6 text-amber-900"
        >
          We&rsquo;re having trouble loading products right now. Please refresh
          in a moment or{" "}
          <Link href="/contact" className="underline">
            contact us
          </Link>{" "}
          if the problem persists.
        </p>
      ) : overPaginated ? (
        <p className="mt-10 rounded-md bg-zinc-50 p-6 text-zinc-700">
          No more products on page {pageNum}.{" "}
          <Link href={backToPageOneHref!} className="underline">
            Back to page 1
          </Link>
        </p>
      ) : page.items.length === 0 ? (
        <p className="mt-10 rounded-md bg-zinc-50 p-6 text-zinc-700">
          {facets.total === 0
            ? (category.emptyStateCopy ??
              "No products found in this collection yet.")
            : "No products match these filters. Try adjusting the price range or removing the in-stock filter."}
        </p>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {page.items.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </ul>
      )}

      <PLPPagination
        page={page.page}
        hasNext={page.hasNext}
        hasPrev={page.hasPrev}
        basePath={basePath}
        searchParams={searchParams}
      />
    </main>
  );
}
