// PLP (Product List Page) reader helpers: pagination, sort, filter,
// and facet aggregation across the 5 commerce PLPs (futon-frames, beds,
// mattresses, mattresses-sale, sofa-beds).
//
// Why in-memory pagination on top of the Wix SDK:
//   • Wix Stores v1 products.queryProducts() only sorts on {name, price,
//     priceData.price, numericId, lastUpdated} — it cannot sort by the
//     effective per-variant `priceRange.minValue` that many manage-variants
//     products need (see cf-24q). We must re-sort in-memory to get price-asc
//     correct for variant-heavy catalogs.
//   • The SDK's `eq/ge/le` allowlist does not include `stock.inStock` or
//     `priceRange.minValue`, so in-stock + price-range filters must be
//     applied in-memory.
//   • Facets (price buckets, stock counts) need to reflect the *entire*
//     collection, not just the current page — one full-catalog scan feeds
//     both the paginated slice and the facet counts.
// Trade-off: we cap the scan at `scanLimit` (default 500) to keep the payload
// bounded. Revisit if any collection grows beyond that threshold.

import * as Sentry from "@sentry/nextjs";
import { getWixClient } from "@/lib/wix-client";
import type { WixProduct } from "@/lib/wix/products";

// ── Public types ────────────────────────────────────────────────────────────

export type PlpSort =
  | "featured"
  | "price-asc"
  | "price-desc"
  | "name-asc"
  | "name-desc"
  | "newest";

export type PlpFilters = {
  priceMin?: number;
  priceMax?: number;
  inStockOnly?: boolean;
};

// "wix_sdk" = a request reached Wix and Wix rejected it (shape match on code/applicationError/response.status).
// "unexpected" = anything else (network error, client misconfig, programming bug in the chain).
// Kept as two values only so the UI can render one copy ("we're having trouble")
// without branching; callers that want to distinguish can do so from the tag alone.
export type PlpReaderError = "wix_sdk" | "unexpected";

export type PlpPage<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
  // Present iff the upstream collection scan failed. Callers MUST check this
  // before rendering the standard empty-state: an errored page with items=[] is
  // NOT the same as a genuinely empty collection (cf-3qt.6.B silent-failure
  // review — "No products found" on a Wix outage is a bounce trap).
  error?: PlpReaderError;
};

// Return shape for the low-level collection scan. Callers must read `items`
// and also check `error`: when `error` is set, `items` is always `[]` and the
// caller must surface an error UI rather than the empty-collection copy.
export type PlpScanResult = {
  items: WixProduct[];
  error?: PlpReaderError;
};

export type PriceBucketSpec = {
  label: string;
  min: number;
  // Exclusive upper bound. Omit for an open-ended top bucket.
  max?: number;
};

export type PriceBucket = PriceBucketSpec & { count: number };

export type FacetCounts = {
  total: number;
  inStock: number;
  outOfStock: number;
  priceBuckets: PriceBucket[];
};

export type ListPlpOptions = {
  page?: number;
  pageSize?: number;
  sort?: PlpSort;
  filters?: PlpFilters;
  scanLimit?: number;
  // When set, skips the Wix collection scan and uses this array as the full
  // product set. Note: the caller is responsible for the completeness of this
  // list — listProductsOnSale returns one SDK page (~48 items), not a full scan.
  prefetchedProducts?: WixProduct[];
};

// Default buckets tuned for futon/mattress catalog price distribution
// ($0 → $200 → $500 → $1000 → $2000 → $2000+).
const DEFAULT_PRICE_BUCKETS: PriceBucketSpec[] = [
  { label: "Under $200", min: 0, max: 200 },
  { label: "$200 – $500", min: 200, max: 500 },
  { label: "$500 – $1,000", min: 500, max: 1000 },
  { label: "$1,000 – $2,000", min: 1000, max: 2000 },
  { label: "$2,000+", min: 2000 },
];

const DEFAULT_SCAN_LIMIT = 500;
const SDK_MAX_PAGE = 100;

// ── Error handling (mirrors products.ts pattern) ────────────────────────────

type WixErrorShape = {
  code?: string;
  details?: { applicationError?: { code?: string } };
  response?: { status?: number };
};

function isWixSdkError(err: unknown): err is WixErrorShape {
  if (typeof err !== "object" || err === null) return false;
  const e = err as Record<string, unknown>;
  if (typeof e.code === "string") return true;
  const details = e.details as { applicationError?: unknown } | undefined;
  if (details?.applicationError && typeof details.applicationError === "object")
    return true;
  const response = e.response as { status?: unknown } | undefined;
  if (typeof response?.status === "number") return true;
  return false;
}

async function logPlpFailure(op: string, err: unknown) {
  const wix = isWixSdkError(err) ? err : null;
  const code = wix?.code ?? wix?.details?.applicationError?.code;
  const httpStatus = wix?.response?.status;
  const message = err instanceof Error ? err.message : String(err);
  const kind = wix ? "wix-sdk" : "unexpected";
  console.error(`[wix] ${op} failed`, { kind, code, httpStatus, message });
  Sentry.captureException(err, {
    level: wix ? "warning" : "error",
    tags: { source: "wix", op, kind },
    extra: { code, httpStatus, message },
  });
  await Sentry.flush(2000);
}

// ── Effective-price accessor ────────────────────────────────────────────────

type PricedProduct = {
  priceData?: {
    price?: number | null;
    currency?: string | null;
  } | null;
  priceRange?: {
    minValue?: number | null;
    maxValue?: number | null;
  } | null;
};

// Returns the price to use for sort + filter + bucketing. Prefers
// `priceRange.minValue` whenever it's present and > 0 — that's the real
// customer-visible floor for variant-heavy products whose base `priceData.price`
// is the manage-variants placeholder 0 (see cf-24q).
function effectivePrice(product: PricedProduct): number {
  const rangeMin =
    typeof product.priceRange?.minValue === "number"
      ? product.priceRange.minValue
      : null;
  const base =
    typeof product.priceData?.price === "number" ? product.priceData.price : 0;
  if (rangeMin !== null && rangeMin > 0) return rangeMin;
  return base;
}

// ── Full-collection scan with cursor walk ───────────────────────────────────

/**
 * Fetches all products in a collection up to `scanLimit`, walking SDK pages
 * via `.next()` when needed.
 *
 * On failure returns `{ items: [], error }` — callers MUST check `error` to
 * distinguish "scan failed" from "collection genuinely empty" (silent-failure
 * review cf-3qt.6.B). The caller is responsible for surfacing a distinct UI.
 */
export async function queryAllProductsByCollection(
  collectionId: string,
  opts: { scanLimit?: number } = {},
): Promise<PlpScanResult> {
  const scanLimit = opts.scanLimit ?? DEFAULT_SCAN_LIMIT;
  if (scanLimit <= 0) return { items: [] };
  try {
    const client = getWixClient();
    const pageSize = Math.min(SDK_MAX_PAGE, scanLimit);
    let result = await client.products
      .queryProducts()
      .hasSome("collectionIds", [collectionId])
      .limit(pageSize)
      .find();
    const collected: WixProduct[] = [...result.items];
    while (collected.length < scanLimit && result.hasNext()) {
      result = await result.next();
      for (const item of result.items) {
        if (collected.length >= scanLimit) break;
        collected.push(item);
      }
    }
    return { items: collected.slice(0, scanLimit) };
  } catch (err) {
    await logPlpFailure(
      `queryAllProductsByCollection(${collectionId})`,
      err,
    );
    return {
      items: [],
      error: isWixSdkError(err) ? "wix_sdk" : "unexpected",
    };
  }
}

// ── Sort + filter pipeline ──────────────────────────────────────────────────

// Throws on invalid filter inputs rather than silently dropping them — a
// NaN/negative/inverted price range reaching this function means the caller
// (URL parser, form handler) didn't sanitize, and silently rendering "0 products"
// hides that bug. Programmer contract: sanitize at the boundary.
function validateFilters(filters: PlpFilters): void {
  const { priceMin, priceMax, inStockOnly } = filters;
  if (priceMin !== undefined) {
    if (typeof priceMin !== "number" || !Number.isFinite(priceMin) || priceMin < 0) {
      throw new Error(`PlpFilters.priceMin must be a finite non-negative number, got: ${priceMin}`);
    }
  }
  if (priceMax !== undefined) {
    if (typeof priceMax !== "number" || !Number.isFinite(priceMax) || priceMax < 0) {
      throw new Error(`PlpFilters.priceMax must be a finite non-negative number, got: ${priceMax}`);
    }
  }
  if (priceMin !== undefined && priceMax !== undefined && priceMin > priceMax) {
    throw new Error(`PlpFilters.priceMin (${priceMin}) must be <= priceMax (${priceMax})`);
  }
  if (inStockOnly !== undefined && typeof inStockOnly !== "boolean") {
    throw new Error(`PlpFilters.inStockOnly must be boolean if provided, got: ${typeof inStockOnly}`);
  }
}

function applyFilters(
  items: WixProduct[],
  filters: PlpFilters | undefined,
): WixProduct[] {
  if (!filters) return items;
  validateFilters(filters);
  const { priceMin, priceMax, inStockOnly } = filters;
  return items.filter((item) => {
    if (inStockOnly && item.stock?.inStock === false) return false;
    if (priceMin !== undefined || priceMax !== undefined) {
      const price = effectivePrice(item);
      if (priceMin !== undefined && price < priceMin) return false;
      if (priceMax !== undefined && price > priceMax) return false;
    }
    return true;
  });
}

// Exhaustive over PlpSort — the `never` check forces a compile error if a new
// variant is added without a case, and the runtime throw catches callers who
// cast past the type (e.g., a URL param that bypasses parseSearchParams).
// Silent fallthrough would render default-sorted "No products" on unknown URLs.
function applySort(items: WixProduct[], sort: PlpSort): WixProduct[] {
  const sorted = [...items];
  switch (sort) {
    case "featured":
      return items;
    case "price-asc":
      sorted.sort((a, b) => effectivePrice(a) - effectivePrice(b));
      return sorted;
    case "price-desc":
      sorted.sort((a, b) => effectivePrice(b) - effectivePrice(a));
      return sorted;
    case "name-asc":
      sorted.sort((a, b) =>
        (a.name ?? "").localeCompare(b.name ?? "", undefined, {
          sensitivity: "base",
        }),
      );
      return sorted;
    case "name-desc":
      sorted.sort((a, b) =>
        (b.name ?? "").localeCompare(a.name ?? "", undefined, {
          sensitivity: "base",
        }),
      );
      return sorted;
    case "newest":
      sorted.sort((a, b) => {
        const at = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
        const bt = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
        return bt - at;
      });
      return sorted;
    default: {
      const exhaustive: never = sort;
      throw new Error(`Unknown PlpSort: ${String(exhaustive)}`);
    }
  }
}

// ── Public: paginated PLP reader ────────────────────────────────────────────

export async function listPlpProducts(
  collectionId: string,
  opts: ListPlpOptions = {},
): Promise<PlpPage<WixProduct>> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.max(1, opts.pageSize ?? 24);
  const sort: PlpSort = opts.sort ?? "featured";
  const scan = await queryAllProductsByCollection(collectionId, {
    scanLimit: opts.scanLimit,
  });
  const filtered = applyFilters(scan.items, opts.filters);
  const sorted = applySort(filtered, sort);
  const total = sorted.length;
  const start = (page - 1) * pageSize;
  const slice = sorted.slice(start, start + pageSize);
  return {
    items: slice,
    total,
    page,
    pageSize,
    hasNext: start + slice.length < total,
    hasPrev: start > 0,
    ...(scan.error ? { error: scan.error } : {}),
  };
}

// ── Public: facet aggregation ───────────────────────────────────────────────

// Minimal shape needed for bucketing. Kept structural (not tied to WixProduct)
// so callers can pre-project the SDK response or pass test fixtures without
// needing to satisfy the full generated Product type.
export type FacetInputProduct = PricedProduct & {
  stock?: { inStock?: boolean | null } | null;
};

export function computeFacets(
  products: FacetInputProduct[],
  opts: { priceBuckets?: PriceBucketSpec[] } = {},
): FacetCounts {
  const specs = opts.priceBuckets ?? DEFAULT_PRICE_BUCKETS;
  const buckets: PriceBucket[] = specs.map((s) => ({ ...s, count: 0 }));
  let inStock = 0;
  let outOfStock = 0;
  for (const product of products) {
    if (product.stock?.inStock === false) outOfStock += 1;
    else inStock += 1;
    const price = effectivePrice(product);
    const bucket = buckets.find(
      (b) => price >= b.min && (b.max === undefined || price < b.max),
    );
    if (bucket) bucket.count += 1;
  }
  return {
    total: products.length,
    inStock,
    outOfStock,
    priceBuckets: buckets,
  };
}

// ── Public: one-shot reader returning page + facets ─────────────────────────

export async function getCollectionPlp(
  collectionId: string,
  opts: ListPlpOptions & { priceBuckets?: PriceBucketSpec[] } = {},
): Promise<{ page: PlpPage<WixProduct>; facets: FacetCounts; error?: PlpReaderError }> {
  // Callers can short-circuit the Wix scan by supplying pre-filtered products
  // (cf-3qt.6.D mattresses-sale derives its list from a different query that
  // has already run upstream). When prefetched, there is no scan → no error.
  const scan: PlpScanResult = opts.prefetchedProducts
    ? { items: opts.prefetchedProducts }
    : await queryAllProductsByCollection(collectionId, {
        scanLimit: opts.scanLimit,
      });
  const facets = computeFacets(scan.items, { priceBuckets: opts.priceBuckets });
  const filtered = applyFilters(scan.items, opts.filters);
  const sorted = applySort(filtered, opts.sort ?? "featured");
  const pageNum = Math.max(1, opts.page ?? 1);
  const pageSize = Math.max(1, opts.pageSize ?? 24);
  const start = (pageNum - 1) * pageSize;
  const slice = sorted.slice(start, start + pageSize);
  return {
    page: {
      items: slice,
      total: sorted.length,
      page: pageNum,
      pageSize,
      hasNext: start + slice.length < sorted.length,
      hasPrev: start > 0,
      ...(scan.error ? { error: scan.error } : {}),
    },
    facets,
    ...(scan.error ? { error: scan.error } : {}),
  };
}

export const __TEST__ = {
  DEFAULT_PRICE_BUCKETS,
  effectivePrice,
  applyFilters,
  applySort,
};
