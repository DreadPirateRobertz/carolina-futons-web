// Thin typed accessors for the Wix Stores module.
// Keep these as 1-call wrappers so downstream consumers import once per helper
// instead of pulling the full Wix client construct into page/route files.
//
// Each reader catches SDK failures and returns null/[] so a transient Wix
// outage renders as an empty PLP / 404 PDP instead of a raw 500. Unexpected
// errors (programmer bugs, etc.) are still caught to keep the page up, but
// are flagged as "unexpected" in Sentry so they don't hide inside Wix-outage
// noise.
import * as Sentry from "@sentry/nextjs";
import { getWixClient } from "@/lib/wix-client";
import { isProductOnSale } from "@/lib/product/on-sale";
import { logWixFailure } from "@/lib/wix/errors";

export async function listProducts(limit = 24) {
  try {
    const client = getWixClient();
    const result = await client.products.queryProducts().limit(limit).find();
    return result.items;
  } catch (err) {
    await logWixFailure("wix", "listProducts", err);
    return [];
  }
}

export async function getProductBySlug(slug: string) {
  try {
    const client = getWixClient();
    const result = await client.products
      .queryProducts()
      .eq("slug", slug)
      .limit(1)
      .find();
    return result.items[0] ?? null;
  } catch (err) {
    await logWixFailure("wix", `getProductBySlug(${slug})`, err);
    return null;
  }
}

export async function listProductsByCollectionId(
  collectionId: string,
  limit = 48,
) {
  try {
    const client = getWixClient();
    const result = await client.products
      .queryProducts()
      .hasSome("collectionIds", [collectionId])
      .limit(limit)
      .find();
    return result.items;
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

export async function listProductsOnSale(collectionId: string) {
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

export async function getCollectionBySlug(slug: string) {
  try {
    const client = getWixClient();
    const result = await client.collections.getCollectionBySlug(slug);
    return result.collection ?? null;
  } catch (err) {
    await logWixFailure("wix", `getCollectionBySlug(${slug})`, err);
    return null;
  }
}

export async function listCollections(limit = 25) {
  try {
    const client = getWixClient();
    const result = await client.collections
      .queryCollections()
      .limit(limit)
      .find();
    return result.items;
  } catch (err) {
    await logWixFailure("wix", "listCollections", err);
    return [];
  }
}

export type WixProduct = NonNullable<
  Awaited<ReturnType<typeof listProducts>>
>[number];
export type WixCollection = NonNullable<
  Awaited<ReturnType<typeof listCollections>>
>[number];
