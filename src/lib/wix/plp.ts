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
// bounded. PLPs currently have < 200 products each, so 500 leaves headroom
// without risking a pathological scan.

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

export type PlpPage<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
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
 * via `.next()` when needed. Returns [] on any SDK failure (Sentry-logged).
 */
export async function queryAllProductsByCollection(
  collectionId: string,
  opts: { scanLimit?: number } = {},
): Promise<WixProduct[]> {
  const scanLimit = opts.scanLimit ?? DEFAULT_SCAN_LIMIT;
  if (scanLimit <= 0) return [];
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
    return collected.slice(0, scanLimit);
  } catch (err) {
    await logPlpFailure(
      `queryAllProductsByCollection(${collectionId})`,
      err,
    );
    return [];
  }
}

// ── Sort + filter pipeline ──────────────────────────────────────────────────

function applyFilters(
  items: WixProduct[],
  filters: PlpFilters | undefined,
): WixProduct[] {
  if (!filters) return items;
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

function applySort(items: WixProduct[], sort: PlpSort): WixProduct[] {
  if (sort === "featured") return items;
  const sorted = [...items];
  switch (sort) {
    case "price-asc":
      sorted.sort((a, b) => effectivePrice(a) - effectivePrice(b));
      break;
    case "price-desc":
      sorted.sort((a, b) => effectivePrice(b) - effectivePrice(a));
      break;
    case "name-asc":
      sorted.sort((a, b) =>
        (a.name ?? "").localeCompare(b.name ?? "", undefined, {
          sensitivity: "base",
        }),
      );
      break;
    case "name-desc":
      sorted.sort((a, b) =>
        (b.name ?? "").localeCompare(a.name ?? "", undefined, {
          sensitivity: "base",
        }),
      );
      break;
    case "newest":
      sorted.sort((a, b) => {
        const at = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
        const bt = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
        return bt - at;
      });
      break;
  }
  return sorted;
}

// ── Public: paginated PLP reader ────────────────────────────────────────────

export async function listPlpProducts(
  collectionId: string,
  opts: ListPlpOptions = {},
): Promise<PlpPage<WixProduct>> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.max(1, opts.pageSize ?? 24);
  const sort: PlpSort = opts.sort ?? "featured";
  const all = await queryAllProductsByCollection(collectionId, {
    scanLimit: opts.scanLimit,
  });
  const filtered = applyFilters(all, opts.filters);
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
): Promise<{ page: PlpPage<WixProduct>; facets: FacetCounts }> {
  const all = await queryAllProductsByCollection(collectionId, {
    scanLimit: opts.scanLimit,
  });
  const facets = computeFacets(all, { priceBuckets: opts.priceBuckets });
  const filtered = applyFilters(all, opts.filters);
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
    },
    facets,
  };
}

export const __TEST__ = {
  DEFAULT_PRICE_BUCKETS,
  effectivePrice,
  applyFilters,
  applySort,
};
