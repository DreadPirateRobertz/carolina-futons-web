import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DEFAULT_OG_IMAGE } from "@/lib/og";
import { Suspense } from "react";
import { getCollectionBySlug } from "@/lib/wix/products";
import { getCollectionPlp, type PlpSort } from "@/lib/wix/plp";
import { SHOP_CATEGORIES, findCategory } from "@/lib/shop/categories";
import {
  resolveDerivedProducts,
  type DerivedProductsResult,
} from "@/lib/shop/derived-products";
import {
  logWixFailure,
  toReaderError,
  type ReaderError,
} from "@/lib/wix/errors";
import { logOverPaginatedRender } from "@/lib/shop/plp-observability";
import { ProductCard } from "@/components/product/ProductCard";
import { HeroReveal } from "@/components/motion/HeroReveal";
import { PLPControls } from "@/components/plp/PLPControls";
import { PLPPagination, buildPageUrl } from "@/components/plp/PLPPagination";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildBreadcrumbSchema, resolveSiteUrl } from "@/lib/seo/json-ld";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return SHOP_CATEGORIES.map((category) => ({ category: category.slug }));
}

export async function generateMetadata(props: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  try {
    const { category: categorySlug } = await props.params;
    const category = findCategory(categorySlug);
    if (!category) return { title: "Shop — Carolina Futons" };
    // Category card thumbnails are 600×400. Declared dimensions let crawlers
    // pre-size the image without fetching it; they are above the 200×200 OG
    // minimum so social cards render correctly.
    const ogImage = category.image
      ? { url: category.image, width: 600, height: 400 }
      : DEFAULT_OG_IMAGE;
    return {
      title: `${category.name} — Carolina Futons`,
      description: category.description,
      openGraph: {
        title: `${category.name} — Carolina Futons`,
        description: category.description,
        images: [ogImage],
      },
    };
  } catch (err) {
    await logWixFailure("category-generateMetadata", "params resolution", err);
    return { title: "Shop — Carolina Futons" };
  }
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
  // Defensive: both inner readers catch their own SDK failures, so this
  // try/catch only fires for programmer bugs (cf-3qt.6.D.F3 review). Tag with
  // page+category context so Sentry triage can pinpoint the failed PLP route.
  let collection: Awaited<ReturnType<typeof getCollectionBySlug>> = null;
  let prefetchedProducts: DerivedProductsResult | undefined;
  let pageReaderError: ReaderError | undefined;
  try {
    [collection, prefetchedProducts] = await Promise.all([
      category.filter ? null : getCollectionBySlug(category.collectionSlug),
      resolveDerivedProducts(category),
    ]);
  } catch (err) {
    await logWixFailure("plp-page", `categorySlug=${categorySlug}`, err);
    pageReaderError = toReaderError(err);
  }

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
          prefetchedProducts: prefetchedProducts?.items,
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
  // outages (silent-failure review required an explicit branch). The derived
  // resolver shares the {items, error?} contract — surface its error too so
  // a missing-source-collection or unknown-filter renders the outage UI
  // instead of a bare "no products on sale" empty state (cf-3qt.6.D.F3).
  const readerFailed =
    pageReaderError !== undefined ||
    page.error !== undefined ||
    prefetchedProducts?.error !== undefined;

  const basePath = `/shop/${categorySlug}`;

  // page=N beyond the last filled page returns items=[] while page.total > 0
  // — this is NOT "no matches", the user is over-paginated. Offer a back-to-
  // page-1 link that preserves sort + filter params, and emit a structured
  // event so a spike is diagnosable (stale external link vs pagination bug vs
  // reader count drift).
  // (refs: cf-3qt.6.B.1 / cf-63w / PR #46)
  const overPaginated =
    pageNum > 1 && page.total > 0 && page.items.length === 0;
  const backToPageOneHref = buildPageUrl(basePath, searchParams, 1);
  // Suppress the log when the reader errored — outage-induced "over-pagination"
  // would pollute the metric we're trying to keep clean (stale-link vs
  // pagination-bug vs count-drift). Outage events ship their own telemetry.
  if (overPaginated && !readerFailed) {
    logOverPaginatedRender({
      categorySlug,
      pageNum,
      pageTotal: page.total,
      pageSize: page.pageSize,
    });
  }

  const siteUrl = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", url: `${siteUrl}/` },
    { name: "Shop", url: `${siteUrl}/shop` },
    { name: category.name, url: `${siteUrl}${basePath}` },
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <JsonLd id="jsonld-breadcrumb" schema={breadcrumbSchema} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          { label: category.name },
        ]}
      />

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

      {/*
        Empty-state ladder — order matters:
          1. readerFailed      outage banner must pre-empt every other empty
                               state (items=[] on a reader error is NOT an
                               empty collection — bounce-trap otherwise)
          2. overPaginated     page>1 with page.total>0 but items=[] is NOT
                               "no matches" — offer back-to-page-1
          3. page.items.empty  genuine empty-collection / filter-eliminated /
                               mattresses-sale empty-sale copy
          4. grid              render products
        Re-ordering breaks branch-precedence assertions in
        src/__tests__/plp-page.test.ts.
        (refs: PR #35 silent-failure / cf-3qt.6.B.1 over-paginated)
      */}
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
          <Link href={backToPageOneHref} className="underline">
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
          {page.items.map((product, i) => (
            // cf-plp-card-stagger: per-card fade+slide-up reveal with index-
            // based delay (60ms step). HeroReveal handles reduced-motion
            // internally — static render under prefers-reduced-motion, no
            // staggered onset. whileInView fires once per card.
            <HeroReveal key={product._id} as="li" delay={i * 0.06}>
              <ProductCard product={product} />
            </HeroReveal>
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
