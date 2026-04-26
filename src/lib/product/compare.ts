// cf-o6r5: ported from src/public/comparePageHelpers.js (Wix Studio).
// Pure functions only — the route renders the result.
//
// Wix Studio compare keys URLs by product _id (?ids=a,b,c). cfw is
// slug-first throughout (PDPs at /products/[slug], shop links carry
// slugs), so this port keys on slugs and resolves them via
// getProductBySlug. The attribute set is unchanged so the side-by-side
// table reads the same fields whether shoppers come from the Wix Studio
// site or the cfw equivalent.

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

// Wix product shape — narrow inline to avoid coupling to the full @wix/sdk
// type tree. Each field is optional because Wix returns sparse objects for
// products that don't fill every attribute.
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
    return product.inStock === false ? "Out of Stock" : "In Stock";
  }
  const sections = product.additionalInfoSections ?? [];
  const target = label.toLowerCase();
  const section = sections.find((s) => s.title?.toLowerCase() === target);
  const description = section?.description ?? "";
  // Strip simple HTML tags from CMS-authored description blobs so the
  // table cell stays a single line. React handles HTML escaping for the
  // returned text, so no manual entity encoding needed.
  const stripped = description.replace(/<[^>]*>/g, "").trim();
  return stripped.length > 0 ? stripped : "—";
}

export function isDiff(values: ReadonlyArray<string>): boolean {
  if (values.length <= 1) return false;
  return values.some((v) => v !== values[0]);
}

export type CompareRow = {
  key: string;
  label: string;
  values: string[];
  hasDiff: boolean;
};

export function buildCompareRows(
  products: ReadonlyArray<CompareProduct>,
): CompareRow[] {
  return COMPARE_ATTRIBUTES.map((attr) => {
    const values = products.map((p) => getCompareAttribute(p, attr.label));
    return {
      key: attr.key,
      label: attr.label,
      values,
      hasDiff: isDiff(values),
    };
  });
}

export function buildCompareTitle(
  products: ReadonlyArray<CompareProduct>,
): string {
  const names = products.map((p) => p.name ?? "Product");
  if (names.length === 0) return "Compare — Carolina Futons";
  return `Compare ${names.join(" vs ")} — Carolina Futons`;
}

export function buildRemoveSlugUrl(
  slugs: ReadonlyArray<string>,
  remove: string,
): string {
  const remaining = slugs.filter((s) => s !== remove);
  if (remaining.length < COMPARE_MIN) return "/compare";
  return `/compare?slugs=${remaining.join(",")}`;
}
