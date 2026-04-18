// Thin typed accessors for the Wix Stores module.
// Keep these as 1-call wrappers so downstream consumers import once per helper
// instead of pulling the full Wix client construct into page/route files.
//
// Each reader catches SDK failures and returns null/[] so a transient Wix
// outage renders as an empty state or 404 at the route layer instead of a raw
// 500. Real errors still hit server logs and are forwarded to Sentry via
// captureException for alerting.
import * as Sentry from "@sentry/nextjs";
import { getWixClient } from "@/lib/wix-client";

function logWixFailure(op: string, err: unknown) {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? (err as { code?: unknown }).code
      : undefined;
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[wix] ${op} failed`, { code, message });
  try {
    Sentry.captureException(err, { extra: { op, code } });
  } catch (sentryErr) {
    console.error("[wix] Sentry.captureException failed", sentryErr);
  }
}

export async function listProducts(limit = 24) {
  try {
    const client = getWixClient();
    const result = await client.products.queryProducts().limit(limit).find();
    return result.items;
  } catch (err) {
    logWixFailure("listProducts", err);
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
    logWixFailure(`getProductBySlug(${slug})`, err);
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
    logWixFailure(`listProductsByCollectionId(${collectionId})`, err);
    return [];
  }
}

export async function getCollectionBySlug(slug: string) {
  try {
    const client = getWixClient();
    const result = await client.collections.getCollectionBySlug(slug);
    return result.collection ?? null;
  } catch (err) {
    logWixFailure(`getCollectionBySlug(${slug})`, err);
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
    logWixFailure("listCollections", err);
    return [];
  }
}

export type WixProduct = NonNullable<
  Awaited<ReturnType<typeof listProducts>>
>[number];
export type WixCollection = NonNullable<
  Awaited<ReturnType<typeof listCollections>>
>[number];
