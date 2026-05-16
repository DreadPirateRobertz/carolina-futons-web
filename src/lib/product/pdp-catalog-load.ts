// cf-8xw2 (cf-g640.fu2): isolate PDP catalog-fetch failure modes.
//
// Pre-cf-8xw2 the PDP page bundled four parallel Wix calls in a single
// Promise.all:
//
//   - getCrossSellProducts
//   - getAlsoBoughtProducts
//   - getProductBadges
//   - getCollectionBySlug("mattresses")  (the cf-g640 warranty gate)
//
// All four currently swallow their own errors and return-null-on-throw,
// so Promise.all is safe today. But the contract is fragile: any future
// refactor that makes ONE of them propagate (e.g. tightening the cross-
// sell reader) cascades into every PDP — warranty gate fails because
// cross-sell throws, etc.
//
// This module wraps the bundle in Promise.allSettled so each failure
// stays local. The page reads .reason on rejected settlements and
// surfaces a fire-and-forget Sentry breadcrumb per failed call via
// logWixFailure, then defaults the corresponding return value.

import { logWixFailure } from "@/lib/wix/errors";

import { getAlsoBoughtProducts } from "./also-bought";
import { getCrossSellProducts } from "./cross-sell";
import { getCollectionBySlug } from "@/lib/wix/products";
import { getProductBadges } from "@/lib/wix/product-badges";

type Product = Parameters<typeof getCrossSellProducts>[0];
type CrossSellResult = Awaited<ReturnType<typeof getCrossSellProducts>>;
type AlsoBoughtResult = Awaited<ReturnType<typeof getAlsoBoughtProducts>>;
type BadgesResult = Awaited<ReturnType<typeof getProductBadges>>;
type MattressesCollectionResult = Awaited<
  ReturnType<typeof getCollectionBySlug>
>;

export type PdpCatalog = {
  crossSell: CrossSellResult;
  alsoBought: AlsoBoughtResult;
  productBadges: BadgesResult;
  mattressesCollection: MattressesCollectionResult;
};

const EMPTY: PdpCatalog = {
  // CrossSellResult + AlsoBoughtResult are `{ items, error? }` envelopes;
  // empty default matches the readers' own no-match return so consumers
  // can treat fail-mode identically to "no recommendations available".
  crossSell: { items: [] } as CrossSellResult,
  alsoBought: { items: [] } as AlsoBoughtResult,
  productBadges: [] as BadgesResult,
  mattressesCollection: null,
};

/**
 * Resolve the four PDP-side Wix calls in parallel. Each rejection is
 * isolated: the others still resolve to their successful value, and the
 * failed call falls back to its safe default + emits a Sentry breadcrumb
 * naming the specific source. The page renders with the remaining
 * data — the cf-g640 warranty gate is independent of the cross-sell
 * carousel's availability, and vice versa.
 *
 * @param product Wix product (consumed by the cross-sell + also-bought readers).
 * @param slug PDP slug (consumed by the product-badges reader + identifies
 *   the page in Sentry breadcrumbs).
 */
export async function loadPdpCatalogSafely(
  product: Product,
  slug: string,
): Promise<PdpCatalog> {
  const results = await Promise.allSettled([
    getCrossSellProducts(product),
    getAlsoBoughtProducts(product),
    getProductBadges(slug),
    getCollectionBySlug("mattresses"),
  ]);

  return {
    crossSell: unwrap(results[0], EMPTY.crossSell, "pdp-crossSell", slug),
    alsoBought: unwrap(results[1], EMPTY.alsoBought, "pdp-alsoBought", slug),
    productBadges: unwrap(
      results[2],
      EMPTY.productBadges,
      "pdp-productBadges",
      slug,
    ),
    mattressesCollection: unwrap(
      results[3],
      EMPTY.mattressesCollection,
      "pdp-mattressesCollection",
      slug,
    ),
  };
}

function unwrap<T>(
  settled: PromiseSettledResult<T>,
  fallback: T,
  source: string,
  slug: string,
): T {
  if (settled.status === "fulfilled") return settled.value;
  // Fire-and-forget Sentry breadcrumb so an outage in one PDP wrapper
  // surfaces in triage without blocking the page render.
  void logWixFailure(source, `PDP slug=${slug}`, settled.reason);
  return fallback;
}
