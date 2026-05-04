import "server-only";

import { listCollectionItems, queryCollectionWhere } from "@/lib/wix/data";
import { logWixFailure } from "@/lib/wix/errors";

export type ProductBadgeType = "New" | "Bestseller" | "Sale" | "CF+ Exclusive";

const VALID_BADGE_TYPES = new Set<string>([
  "New",
  "Bestseller",
  "Sale",
  "CF+ Exclusive",
]);

function isBadgeType(v: unknown): v is ProductBadgeType {
  return typeof v === "string" && VALID_BADGE_TYPES.has(v);
}

type BadgeRow = {
  productSlug?: string;
  badges?: unknown;
};

function parseBadges(row: BadgeRow): ProductBadgeType[] {
  const raw = row.badges;
  if (!Array.isArray(raw)) return [];
  return raw.filter(isBadgeType);
}

const COLLECTION = "ProductBadges";

/** Fetch badges for a single product slug — used on PDP. */
export async function getProductBadges(
  slug: string,
): Promise<ProductBadgeType[]> {
  try {
    const rows = await queryCollectionWhere<BadgeRow>(
      COLLECTION,
      "productSlug",
      slug,
      1,
    );
    return rows.length > 0 ? parseBadges(rows[0]) : [];
  } catch (err) {
    await logWixFailure("wix-cms", `getProductBadges(${slug})`, err);
    return [];
  }
}

/** Fetch all badge rows and return a slug→badges map — used on PLP. */
export async function listAllProductBadges(): Promise<
  Map<string, ProductBadgeType[]>
> {
  try {
    const rows = await listCollectionItems<BadgeRow>(COLLECTION, 500);
    const map = new Map<string, ProductBadgeType[]>();
    for (const row of rows) {
      if (row.productSlug) {
        map.set(row.productSlug, parseBadges(row));
      }
    }
    return map;
  } catch (err) {
    await logWixFailure("wix-cms", "listAllProductBadges", err);
    return new Map();
  }
}
