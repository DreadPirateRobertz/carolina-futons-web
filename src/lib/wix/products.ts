// Thin typed accessors for the Wix Stores module.
// Keep these as 1-call wrappers so downstream consumers import once per helper
// instead of pulling the full Wix client construct into page/route files.
//
// Each reader catches recognized Wix API errors and returns null/[] so a
// transient Wix outage renders as an empty state or 404 at the route layer
// instead of a raw 500. Non-Wix errors (TypeError, ReferenceError, etc.) are
// re-thrown so programming mistakes surface. Real errors hit server logs and
// are forwarded to Sentry via captureException for alerting.
import * as Sentry from "@sentry/nextjs";
import { getWixClient } from "@/lib/wix-client";

// Wix SDK errors are always Error instances. They carry either a `code` field
// (HTTP status / application error code), a `response` property (SDK REST
// error), or are a network-level `TypeError` from Node's fetch() failing to
// reach the Wix API (ECONNREFUSED, DNS failure, etc.). All three are
// infrastructure failures that should degrade gracefully. Non-Wix errors
// (ReferenceError, null-deref TypeError without "fetch failed", etc.) are
// programming mistakes — they should surface, not be silently swallowed.
// Note: plain objects like { code: 404 } won't pass because instanceof Error
// is required. `response` is typed as unknown because the two Wix error shapes
// differ: FetchErrorResponse carries a Fetch API Response object, while SDKError
// carries a plain { data, status } object. We only test key presence, not shape.
type WixApiError = Error & {
  code?: string | number;
  response?: unknown;
};

function isWixApiError(err: unknown): err is WixApiError {
  if (!(err instanceof Error)) return false;
  if ("code" in err || "response" in err) return true;
  // Node fetch() network failures (ECONNREFUSED, DNS, timeout) throw a
  // plain TypeError with no code/response — treat as infrastructure failure.
  return err instanceof TypeError && err.message === "fetch failed";
}

function logWixFailure(op: string, err: WixApiError) {
  const code = err.code;
  const message = err.message;
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
    if (!isWixApiError(err)) throw err;
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
    if (!isWixApiError(err)) throw err;
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
    if (!isWixApiError(err)) throw err;
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
    if (!isWixApiError(err)) throw err;
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
    if (!isWixApiError(err)) throw err;
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
