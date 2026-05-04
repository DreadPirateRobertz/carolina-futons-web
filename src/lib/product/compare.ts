// Product comparison helpers — ported from main cfw src/lib/product/compare.ts.
// Pure functions only; no Wix SDK dependency at this layer.

export const COMPARE_MIN = 2;
export const COMPARE_MAX = 4;

export type CompareAttribute = { key: string; label: string };

export const COMPARE_ATTRIBUTES: ReadonlyArray<CompareAttribute> = [
  { key: "frameMaterial", label: "Frame Material" },
  { key: "closedDimensions", label: "Closed Dimensions" },
  { key: "openDimensions", label: "Open Dimensions" },
  { key: "weightCapacity", label: "Weight Capacity" },
  { key: "mattressSize", label: "Mattress Size" },
  { key: "seatHeight", label: "Seat Height" },
  { key: "price", label: "Price" },
  { key: "rating", label: "Rating" },
  { key: "inStock", label: "In Stock" },
  { key: "availableFabrics", label: "Available Fabrics" },
];

export type CompareProduct = {
  _id?: string | null;
  slug?: string | null;
  name?: string | null;
  inStock?: boolean | null;
  numericRating?: number | null;
  priceData?: {
    formatted?: { price?: string | null } | null;
    price?: number | null;
  } | null;
  media?: {
    mainMedia?: { image?: { url?: string | null } | null } | null;
  } | null;
  additionalInfoSections?: ReadonlyArray<{
    title?: string | null;
    description?: string | null;
  }> | null;
};

export function parseCompareSlugs(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  const value = Array.isArray(raw) ? raw.join(",") : raw;
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, COMPARE_MAX);
}

export function shouldShowEmpty(slugsOrProducts: { length: number }): boolean {
  return slugsOrProducts.length < COMPARE_MIN;
}

export function getCompareAttribute(
  product: CompareProduct,
  label: string,
): string {
  if (label === "Price") {
    return (
      product.priceData?.formatted?.price ??
      (typeof product.priceData?.price === "number"
        ? `$${product.priceData.price.toFixed(2)}`
        : "—")
    );
  }
  if (label === "Rating") {
    return typeof product.numericRating === "number"
      ? `${product.numericRating} / 5`
      : "—";
  }
  if (label === "In Stock") {
    if (product.inStock === true) return "In Stock";
    if (product.inStock === false) return "Out of Stock";
    return "—";
  }
  // All other attributes live in additionalInfoSections keyed by title.
  const section = product.additionalInfoSections?.find(
    (s) => s.title === label,
  );
  return section?.description ?? "—";
}

// Returns a matrix row for the attribute across all products in the comparison.
// Used to drive the side-by-side comparison table.
export function buildCompareRow(
  products: CompareProduct[],
  attribute: CompareAttribute,
): { label: string; values: string[] } {
  return {
    label: attribute.label,
    values: products.map((p) => getCompareAttribute(p, attribute.label)),
  };
}

// Returns true if all products in the comparison have the same value for
// the given attribute — used to highlight rows where products differ.
export function isRowUniform(values: string[]): boolean {
  return values.length < 2 || values.every((v) => v === values[0]);
}
