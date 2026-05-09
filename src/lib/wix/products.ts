// Thin typed accessors for the Wix Stores module.
// Keep these as 1-call wrappers so downstream consumers import once per helper
// instead of pulling the full Wix client construct into page/route files.
//
// Each reader catches SDK failures and returns null/[] so a transient Wix
// outage renders as an empty PLP / 404 PDP instead of a raw 500. Unexpected
// errors (programmer bugs, etc.) are still caught to keep the page up, but
// are flagged as "unexpected" in Sentry so they don't hide inside Wix-outage
// noise.
//
// NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1 bakes fixture data at build time so
// Vercel preview builds can exercise cart/checkout/shipping flows without
// touching the production Wix catalog. This flag MUST NOT be set in prod.
import * as Sentry from "@sentry/nextjs";
import type { Product as WixProductSDK } from "@wix/auto_sdk_stores_products";
import type { Collection as WixCollectionSDK } from "@wix/auto_sdk_stores_collections";
import { getWixClient } from "@/lib/wix-client";
import { isProductOnSale } from "@/lib/product/on-sale";
import { logWixFailure } from "@/lib/wix/errors";
import {
  FIXTURE_PRODUCTS,
  getFixtureProductBySlug,
} from "@/lib/fixtures/products";
import {
  FIXTURE_COLLECTIONS,
  getFixtureCollectionBySlug,
} from "@/lib/fixtures/collections";

// WixProduct/WixCollection import directly from the Wix SDK package types
// rather than being inferred from the function return types — this avoids a
// circular type reference now that the functions can return fixture data.
export type WixProduct = WixProductSDK;
export type WixCollection = WixCollectionSDK;

const USE_FIXTURES = process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS === "1";

export async function listProducts(limit = 24): Promise<WixProduct[]> {
  if (USE_FIXTURES) return FIXTURE_PRODUCTS.slice(0, limit) as unknown as WixProduct[];
  try {
    const client = getWixClient();
    const result = await client.products.queryProducts().limit(limit).find();
    return result.items as WixProduct[];
  } catch (err) {
    await logWixFailure("wix", "listProducts", err);
    return [];
  }
}

// cfw-cus: getProduct(_id) returns variants WITHOUT variant.priceData populated
// (the SDK NonNullablePaths confirm: getProduct guarantees variant.weight/sku/
// visible but NOT priceData; queryProductVariants is the API path that does).
// Merge per-variant priceData by _id so the PDP variant picker can swap price
// when a different size/option is selected. Falls through silently on failure
// (network / auth) so a transient Wix outage degrades to the product-level
// fallback price instead of breaking the page.
export function mergeVariantPriceData<T extends WixProduct>(
  product: T,
  variantsWithPriceData: ReadonlyArray<{ _id?: string | null; variant?: { priceData?: unknown } | null }> | null,
): T {
  if (!variantsWithPriceData || variantsWithPriceData.length === 0) return product;
  if (!product.variants || product.variants.length === 0) return product;
  const priceById = new Map<string, unknown>();
  for (const v of variantsWithPriceData) {
    if (v?._id && v.variant?.priceData) priceById.set(v._id, v.variant.priceData);
  }
  if (priceById.size === 0) return product;
  return {
    ...product,
    variants: product.variants.map((v: { _id?: string | null; variant?: object | null }) => {
      const priceData = v?._id ? priceById.get(v._id) : undefined;
      if (!priceData) return v;
      return {
        ...v,
        variant: { ...(v.variant ?? {}), priceData },
      };
    }),
  } as T;
}

// cfw-3l9: pick the longer media.items[] across the two-step Wix fetch.
// queryProducts and getProduct don't return identical shapes — getProduct
// occasionally drops items[] entirely. Merging keeps mainMedia + per-choice
// media intact and only swaps in the alternate items[] when it has more
// entries (the only signal we have that it's the truer list).
export function mergeProductMedia<T extends WixProduct>(full: T, stub: WixProduct): T {
  const fullItems = full.media?.items ?? [];
  const stubItems = stub.media?.items ?? [];
  const fullMain = full.media?.mainMedia;
  const stubMain = stub.media?.mainMedia;
  const needsItems = stubItems.length > fullItems.length;
  const needsMain = !fullMain && Boolean(stubMain);
  if (!needsItems && !needsMain) return full;
  return {
    ...full,
    media: {
      ...(full.media ?? {}),
      mainMedia: fullMain ?? stubMain,
      items: needsItems ? stubItems : fullItems,
    },
  };
}

export async function getProductBySlug(slug: string): Promise<WixProduct | null> {
  if (USE_FIXTURES) return getFixtureProductBySlug(slug) as unknown as WixProduct | null;
  try {
    const client = getWixClient();
    // Two-step fetch: slug query resolves the _id, then getProduct(_id) returns
    // the full product including productOptions/variants. queryProducts omits
    // productOptions from its response, leaving the PDP variant picker empty.
    const result = await client.products
      .queryProducts()
      .eq("slug", slug)
      .limit(1)
      .find();
    const stub = result.items[0] ?? null;
    if (!stub) return null;
    if (!stub._id) {
      await logWixFailure(
        "wix",
        `getProductBySlug(${slug})`,
        new Error(`queryProducts returned stub with no _id — malformed catalog entry`),
      );
      return null;
    }
    // cfw-cus: queryProductVariants is the only Wix Stores read API that
    // includes variant.priceData. getProduct returns variants without it, so
    // the PDP picker was stuck on the product fallback price across every
    // size selection (Stilgar repro: Kingston Twin/Full/Queen/King all $619).
    // Fire both calls in parallel; queryProductVariants is wrapped so a
    // missing method (older mock clients) or a transient Wix outage degrades
    // to the fallback price instead of taking the PDP down.
    // Capture _id into a const so the inner closure keeps the type narrowing
    // from the `!stub._id` guard above (TS2345 otherwise — closures lose it).
    const productId: string = stub._id;
    const queryVariantPriceData = async () => {
      try {
        const queryFn = (
          client.products as { queryProductVariants?: (id: string, opts: object) => Promise<unknown> }
        ).queryProductVariants;
        if (typeof queryFn !== "function") return null;
        return (await queryFn(productId, {})) as { variants?: ReadonlyArray<{ _id?: string | null; variant?: { priceData?: unknown } | null }> } | null;
      } catch (err) {
        await logWixFailure("wix", `queryProductVariants(${productId})`, err);
        return null;
      }
    };
    const [full, variantPriceResp] = await Promise.all([
      client.products.getProduct(productId),
      queryVariantPriceData(),
    ]);
    if (!full.product) {
      await logWixFailure(
        "wix",
        `getProductBySlug(${slug})`,
        new Error(`getProduct(${stub._id}) returned empty envelope`),
      );
      return null;
    }
    // cfw-3l9: getProduct(_id) returns the full product including
    // productOptions/variants — but in practice it returns an empty
    // media.items[], while the queryProducts stub carries the populated
    // items[] (Stilgar repro: PDP gallery renders only mainMedia, no thumbs).
    // Prefer whichever response has more image items so the gallery surfaces
    // every Wix-uploaded photo. Use queryProducts' mainMedia too when the
    // full response is missing it.
    const merged = mergeProductMedia(full.product, stub);
    return mergeVariantPriceData(
      merged,
      variantPriceResp?.variants ?? null,
    );
  } catch (err) {
    await logWixFailure("wix", `getProductBySlug(${slug})`, err);
    return null;
  }
}

export async function listProductsByCollectionId(
  collectionId: string,
  limit = 48,
): Promise<WixProduct[]> {
  if (USE_FIXTURES) {
    return FIXTURE_PRODUCTS.filter((p) =>
      (p.collectionIds as string[] | undefined)?.includes(collectionId),
    ).slice(0, limit) as unknown as WixProduct[];
  }
  try {
    const client = getWixClient();
    const result = await client.products
      .queryProducts()
      .hasSome("collectionIds", [collectionId])
      .limit(limit)
      .find();
    return result.items as WixProduct[];
  } catch (err) {
    await logWixFailure("wix", `listProductsByCollectionId(${collectionId})`, err);
    return [];
  }
}

// Scan up to this many products total when building the sale page. Mattresses
// catalog is small (~30 SKUs), so this ceiling only fires if the collection
// grows unexpectedly large — raising a Sentry warning for ops review.
const SALE_SCAN_LIMIT = 500;
const SALE_PAGE_SIZE = 100;

export async function listProductsOnSale(collectionId: string): Promise<WixProduct[]> {
  if (USE_FIXTURES) {
    return FIXTURE_PRODUCTS.filter((p) =>
      (p.collectionIds as string[] | undefined)?.includes(collectionId),
    ).filter(isProductOnSale as (p: unknown) => boolean) as unknown as WixProduct[];
  }
  try {
    const client = getWixClient();
    const all: WixProduct[] = [];
    let page = await client.products
      .queryProducts()
      .hasSome("collectionIds", [collectionId])
      .limit(SALE_PAGE_SIZE)
      .find();
    all.push(...page.items);
    while (page.hasNext() && all.length < SALE_SCAN_LIMIT) {
      try {
        page = await page.next();
      } catch (midErr) {
        await logWixFailure("wix", `listProductsOnSale(mid-loop, after ${all.length} items)`, midErr);
        return all.filter(isProductOnSale);
      }
      all.push(...page.items);
    }
    const overshot = all.length > SALE_SCAN_LIMIT;
    const ceilingHit = all.length >= SALE_SCAN_LIMIT && page.hasNext();
    if (overshot) all.splice(SALE_SCAN_LIMIT);
    if (overshot || ceilingHit) {
      Sentry.captureMessage(
        `[listProductsOnSale] scan ceiling (${SALE_SCAN_LIMIT}) hit for collection ${collectionId} — some sale products may be missing from PLP`,
        { level: "warning" },
      );
      await Sentry.flush(2000);
    }
    return all.filter(isProductOnSale);
  } catch (err) {
    await logWixFailure("wix", "listProductsOnSale", err);
    return [];
  }
}

export async function getCollectionBySlug(slug: string): Promise<WixCollection | null> {
  if (USE_FIXTURES) return getFixtureCollectionBySlug(slug) as unknown as WixCollection | null;
  try {
    const client = getWixClient();
    const result = await client.collections.getCollectionBySlug(slug);
    return (result.collection ?? null) as WixCollection | null;
  } catch (err) {
    await logWixFailure("wix", `getCollectionBySlug(${slug})`, err);
    return null;
  }
}

export async function listCollections(limit = 25): Promise<WixCollection[]> {
  if (USE_FIXTURES) return FIXTURE_COLLECTIONS.slice(0, limit) as unknown as WixCollection[];
  try {
    const client = getWixClient();
    const result = await client.collections
      .queryCollections()
      .limit(limit)
      .find();
    return result.items as WixCollection[];
  } catch (err) {
    await logWixFailure("wix", "listCollections", err);
    return [];
  }
}

// Wix queryProducts() SDK caps .limit() at 100. Anything that needs the
// full catalog (search index, sitemap) must paginate explicitly — a single
// call with limit=1000 fails SDK validation and the catch returns [].
const PRODUCT_PAGE_SIZE = 100;
const SEARCH_CATALOG_CAP = 500;
// Sitemap default — covers ~10x the current 88 SKU catalog. Cap exists so
// a runaway iteration can't infinite-loop in a Vercel build.
const SITEMAP_CATALOG_CAP = 1000;

// cfw-upa: paginate-to-completion helper. Replaces the previous
// `listProducts(1000)` call site (Wix rejected the 1000-limit and the
// sitemap silently dropped every product URL).
export async function listAllProducts(
  cap: number = SITEMAP_CATALOG_CAP,
): Promise<WixProduct[]> {
  if (USE_FIXTURES) {
    return FIXTURE_PRODUCTS.slice(0, cap) as unknown as WixProduct[];
  }
  try {
    const client = getWixClient();
    const all: WixProduct[] = [];
    let page = await client.products
      .queryProducts()
      .limit(PRODUCT_PAGE_SIZE)
      .find();
    all.push(...page.items);
    while (page.hasNext() && all.length < cap) {
      page = await page.next();
      all.push(...page.items);
    }
    return all.slice(0, cap);
  } catch (err) {
    await logWixFailure("wix", "listAllProducts", err);
    return [];
  }
}

// cf-346v / cf-ni0z: fetch full catalog and filter in-memory so substring
// queries like "futon" or "monterey" match anywhere in the product name.
// Now delegates to listAllProducts so pagination logic lives in one place.
async function getAllProductsForSearch(): Promise<WixProduct[]> {
  return listAllProducts(SEARCH_CATALOG_CAP);
}

export async function searchProducts(
  q: string,
  limit = 12,
): Promise<WixProduct[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];
  const lower = trimmed.toLowerCase();
  if (USE_FIXTURES) {
    return FIXTURE_PRODUCTS
      .filter((p) => (p.name as string | undefined ?? "").toLowerCase().includes(lower))
      .slice(0, limit) as unknown as WixProduct[];
  }
  const all = await getAllProductsForSearch();
  return all
    .filter((p) => (p.name ?? "").toLowerCase().includes(lower))
    .slice(0, limit);
}

export async function listGiftCards(): Promise<WixProduct[]> {
  if (USE_FIXTURES) return [];
  try {
    const client = getWixClient();
    const result = await client.products
      .queryProducts()
      .eq("productType", "gift_card")
      .limit(20)
      .find();
    return result.items as WixProduct[];
  } catch (err) {
    await logWixFailure("wix", "listGiftCards", err);
    return [];
  }
}
