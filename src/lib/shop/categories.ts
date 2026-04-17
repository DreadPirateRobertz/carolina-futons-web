// Static manifest of the 5 PLP categories in Phase 2 scope (cf-3qt.2).
// `slug` is the URL segment; `collectionSlug` is the Wix Stores collection
// slug used when resolving to a collection id via
// `collections.getCollectionBySlug`. We keep them separate so marketing
// can later remap a PLP URL without re-slugging the Wix collection (or
// vice versa).
//
// Phase 0 Q: confirm all 5 collection slugs match Wix Stores (morgott +
// millicent smoke test) before Phase 2 traffic hits these.

export type ShopCategory = {
  slug: string;
  name: string;
  description: string;
  collectionSlug: string;
};

export const SHOP_CATEGORIES: readonly ShopCategory[] = [
  {
    slug: "futon-frames",
    name: "Futon Frames",
    description: "Hardwood futon frames made in North Carolina.",
    collectionSlug: "futon-frames",
  },
  {
    slug: "murphy-cabinet-beds",
    name: "Murphy Cabinet Beds",
    description: "Cabinet beds that fold away without hardware in the wall.",
    collectionSlug: "murphy-cabinet-beds",
  },
  {
    slug: "platform-beds",
    name: "Platform Beds",
    description: "Low-profile solid-wood platform beds.",
    collectionSlug: "platform-beds",
  },
  {
    slug: "mattresses",
    name: "Mattresses",
    description: "Futon mattresses and bed mattresses.",
    collectionSlug: "mattresses",
  },
  {
    slug: "mattresses-sale",
    name: "Mattresses on Sale",
    description: "Current mattress promotions.",
    collectionSlug: "mattresses-sale",
  },
] as const;

export function findCategory(slug: string): ShopCategory | undefined {
  return SHOP_CATEGORIES.find((c) => c.slug === slug);
}
