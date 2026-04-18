// Thin typed accessors for the Wix Stores module.
// Keep these as 1-call wrappers so downstream consumers import once per helper
// instead of pulling the full Wix client construct into page/route files.
//
// Each reader catches SDK failures and returns null/[] so a transient Wix
// outage renders as an empty PLP / 404 PDP instead of a raw 500. Unexpected
// errors (programmer bugs, etc.) are still caught to keep the page up, but
// are flagged as "unexpected" in Sentry so they don't hide inside Wix-outage
// noise.
import { getWixClient } from "@/lib/wix-client";
import { isProductOnSale } from "@/lib/product/on-sale";
import { logWixFailure as logWixFailureShared } from "@/lib/wix/errors";

// Thin re-tag so existing call sites keep their one-arg signature; passes
// `source: "wix"` to preserve the console prefix + Sentry tag used before
// the shared helper was extracted.
const logWixFailure = (op: string, err: unknown) =>
  logWixFailureShared("wix", op, err);

export async function listProducts(limit = 24) {
  try {
    const client = getWixClient();
    const result = await client.products.queryProducts().limit(limit).find();
    return result.items;
  } catch (err) {
    await logWixFailure("listProducts", err);
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
    await logWixFailure(`getProductBySlug(${slug})`, err);
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
    await logWixFailure(`listProductsByCollectionId(${collectionId})`, err);
    return [];
  }
}

export async function listProductsOnSale(collectionId: string, limit = 48) {
  const products = await listProductsByCollectionId(collectionId, limit);
  return products.filter(isProductOnSale);
}

export async function getCollectionBySlug(slug: string) {
  try {
    const client = getWixClient();
    const result = await client.collections.getCollectionBySlug(slug);
    return result.collection ?? null;
  } catch (err) {
    await logWixFailure(`getCollectionBySlug(${slug})`, err);
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
    await logWixFailure("listCollections", err);
    return [];
  }
}

export type WixProduct = NonNullable<
  Awaited<ReturnType<typeof listProducts>>
>[number];
export type WixCollection = NonNullable<
  Awaited<ReturnType<typeof listCollections>>
>[number];
