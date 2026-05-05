import "server-only";

import { listCollectionItems, queryCollectionWhere } from "@/lib/wix/data";
import { logWixFailure } from "@/lib/wix/errors";

// cf-l6aj.3: per-product colour-swatch metadata for PLP cards.
// Schema mirrors cf-l6aj.2 / ProductBadges (slug→array). One CMS row per
// product; component derives count + visible-dot slice.
//
// Schema (mailed to melania for dallas cross-rig parity check before wiring):
//   collection: ProductSwatches
//   productSlug: Text (unique key, matches Wix product.slug)
//   swatches:    Array<Object>  — ordered, top-down preference
//     name: Text  e.g. "Slate Grey"
//     hex:  Text  7-char hex e.g. "#5A5F66"

export type ProductSwatch = {
  name: string;
  hex: string;
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function isSwatchObject(v: unknown): v is { name: unknown; hex: unknown } {
  return typeof v === "object" && v !== null && "name" in v && "hex" in v;
}

function parseSwatch(raw: unknown): ProductSwatch | null {
  if (!isSwatchObject(raw)) return null;
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const hex = typeof raw.hex === "string" ? raw.hex.trim() : "";
  if (!name) return null;
  if (!HEX_RE.test(hex)) return null;
  return { name, hex };
}

type SwatchRow = {
  productSlug?: string;
  swatches?: unknown;
};

function parseRow(row: SwatchRow): ProductSwatch[] {
  const raw = row.swatches;
  if (!Array.isArray(raw)) return [];
  const parsed: ProductSwatch[] = [];
  for (const entry of raw) {
    const swatch = parseSwatch(entry);
    if (swatch) parsed.push(swatch);
  }
  return parsed;
}

const COLLECTION = "ProductSwatches";

/** Single-slug fetch — used on PDP if/when we surface swatches there. */
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
    return rows.length > 0 ? parseRow(rows[0]) : [];
  } catch (err) {
    await logWixFailure("wix-cms", `getProductSwatches(${slug})`, err);
    return [];
  }
}

/** Batch fetch — used on PLP / Featured strip. Same pattern as listAllProductBadges. */
export async function listAllProductSwatches(): Promise<
  Map<string, ProductSwatch[]>
> {
  try {
    const rows = await listCollectionItems<SwatchRow>(COLLECTION, 500);
    const map = new Map<string, ProductSwatch[]>();
    for (const row of rows) {
      if (!row.productSlug) continue;
      const swatches = parseRow(row);
      if (swatches.length > 0) {
        map.set(row.productSlug, swatches);
      }
    }
    return map;
  } catch (err) {
    await logWixFailure("wix-cms", "listAllProductSwatches", err);
    return new Map();
  }
}
