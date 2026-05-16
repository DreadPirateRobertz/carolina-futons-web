import "server-only";

import { listCollectionItems, queryCollectionWhere } from "@/lib/wix/data";
import { logWixFailure } from "@/lib/wix/errors";
import { logWarn } from "@/lib/observability/log";

// CMS contract — the TypeScript types below don't capture the Wix collection
// shape, so it lives here:
//   collection: ProductSwatches
//   productSlug: Text   (unique key — matches Wix product.slug)
//   swatches:    Array<Object>
//     name: Text   e.g. "Slate Grey"
//     hex:  Text   7-char hex e.g. "#5A5F66"

export type ProductSwatch = {
  name: string;
  hex: string;
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

async function parseSwatch(raw: unknown): Promise<ProductSwatch | null> {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as { name?: unknown; hex?: unknown };
  const name = typeof r.name === "string" ? r.name.trim() : "";
  const hex = typeof r.hex === "string" ? r.hex.trim() : "";
  if (!name || !HEX_RE.test(hex)) {
    // cfw-herv: visible signal so a content editor entering "blue"
    // instead of "#0000ff" doesn't silently disappear from the grid.
    // Now routed through logWarn so Sentry sees the trend and ops
    // can ping Brenda when content drifts.
    await logWarn(
      "product-swatches",
      "dropping malformed swatch row",
      undefined,
      { name: r.name, hex: r.hex },
    );
    return null;
  }
  return { name, hex };
}

type SwatchRow = {
  productSlug?: string;
  swatches?: unknown;
};

async function parseRow(row: SwatchRow): Promise<ProductSwatch[]> {
  const raw = row.swatches;
  if (!Array.isArray(raw)) return [];
  const parsed: ProductSwatch[] = [];
  for (const entry of raw) {
    const swatch = await parseSwatch(entry);
    if (swatch) parsed.push(swatch);
  }
  return parsed;
}

const COLLECTION = "ProductSwatches";

export async function getProductSwatches(
  slug: string,
): Promise<ProductSwatch[]> {
  try {
    const rows = await queryCollectionWhere<SwatchRow>(
      COLLECTION,
      "productSlug",
      slug,
      1,
    );
    return rows.length > 0 ? await parseRow(rows[0]) : [];
  } catch (err) {
    await logWixFailure("wix-cms", `getProductSwatches(${slug})`, err);
    return [];
  }
}

export async function listAllProductSwatches(): Promise<
  Map<string, ProductSwatch[]>
> {
  try {
    const rows = await listCollectionItems<SwatchRow>(COLLECTION, 500);
    const map = new Map<string, ProductSwatch[]>();
    for (const row of rows) {
      if (!row.productSlug) continue;
      // Don't pre-filter empty results — the consumer (enrich-colors) does its
      // own empty check, and pre-filtering hides "all rows dropped" outages.
      map.set(row.productSlug, await parseRow(row));
    }
    // Three indistinguishable observations otherwise: empty collection /
    // all-rows-dropped / thrown error. The thrown error is logged via the
    // catch block — this signal covers the all-rows-dropped case (someone
    // renamed the productSlug field, wiped the collection, etc.).
    if (rows.length > 0 && map.size === 0) {
      await logWixFailure(
        "wix-cms",
        "listAllProductSwatches",
        new Error(
          `received ${rows.length} rows but every row was dropped (missing productSlug or all swatches malformed) — check CMS schema`,
        ),
      );
    }
    return map;
  } catch (err) {
    await logWixFailure("wix-cms", "listAllProductSwatches", err);
    return new Map();
  }
}
