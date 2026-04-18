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

type WixErrorShape = {
  code?: string;
  message?: string;
  details?: { applicationError?: { code?: string; description?: string } };
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

// Await flush so Sentry's HTTP POST completes before Vercel freezes the
// serverless function — otherwise captureException queues the event and the
// request dies before it ships. 2s is the Sentry-recommended ceiling for
// serverless handlers.
async function logWixFailure(op: string, err: unknown) {
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
