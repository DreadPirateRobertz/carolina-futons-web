// Static manifest of the 5 PLP categories in Phase 2 scope (cf-3qt.2).
// `slug` is the URL segment; `collectionSlug` is the Wix Stores collection
// slug used when resolving to a collection id via
// `collections.getCollectionBySlug`. We keep them separate so marketing
// can later remap a PLP URL without re-slugging the Wix collection (or
// vice versa).

// Supported derived-category filters. A category with `filter` set sources its
// products from `sourceSlug` (or `collectionSlug` if `sourceSlug` is omitted)
// and keeps only the items matching this predicate. Add a new value here and
// a branch in derived-products.ts to register a new derived category.
export type CategoryFilter = "on-sale";

export type ShopCategory = {
  slug: string;
  name: string;
  description: string;
  // Wix Stores collection slug for the base product source. For regular
  // categories this is the collection the PLP renders. For derived categories
  // (filter set) it's the fallback source when sourceSlug is omitted.
  collectionSlug: string;
  // Derived categories source products from a different collection than the
  // one matching their URL slug (there is no 'mattresses-sale' collection in
  // Wix — the products live in 'mattresses').
  sourceSlug?: string;
  // When set, the PLP prefetches the source collection and keeps only the
  // items passing this predicate before rendering.
  filter?: CategoryFilter;
  // Override the default "No products found in this collection yet." empty
  // state for derived categories where that copy misleads (e.g. "no active
  // sale" is a normal state, not a data gap).
  emptyStateCopy?: string;
  // Wix CDN image URL for the category card thumbnail.
  image?: string;
};

export const SHOP_CATEGORIES: readonly ShopCategory[] = [
  {
    slug: "futon-frames",
    name: "Futon Frames",
    description: "Hardwood futon frames made in North Carolina.",
    collectionSlug: "futon-frames",
    image: "https://static.wixstatic.com/media/e04e89_4bea49a709a3470a8315b5acd7309b0f~mv2.jpg/v1/fill/w_600,h_400,q_90/file.jpg",
  },
  {
    slug: "murphy-cabinet-beds",
    name: "Murphy Cabinet Beds",
    description: "Cabinet beds that fold away without hardware in the wall.",
    collectionSlug: "murphy-cabinet-beds",
    image: "https://static.wixstatic.com/media/e04e89_818d75df410a41e1a0721207333bc93d~mv2.jpg/v1/fill/w_600,h_400,q_90/file.jpg",
  },
  {
    slug: "platform-beds",
    name: "Platform Beds",
    description: "Low-profile solid-wood platform beds.",
    collectionSlug: "platform-beds",
    image: "https://static.wixstatic.com/media/e04e89_8cd0de059f244e8485a600d4783caa92~mv2.jpg/v1/fill/w_600,h_400,q_90/file.jpg",
  },
  {
    slug: "mattresses",
    name: "Mattresses",
    description: "Futon mattresses and bed mattresses.",
    collectionSlug: "mattresses",
    image: "https://static.wixstatic.com/media/e04e89_55ecd0dfe1d5498b8a3f8cb583d5089b~mv2.jpg/v1/fill/w_600,h_400,q_90/file.jpg",
  },
  {
    slug: "sofa-beds",
    name: "Sofa Beds",
    description: "Convertible sofa beds — seat by day, guest bed by night.",
    collectionSlug: "sofa-beds",
    image: "https://static.wixstatic.com/media/e04e89_4bea49a709a3470a8315b5acd7309b0f~mv2.jpg/v1/fill/w_600,h_400,q_90/file.jpg",
  },
  {
    slug: "sale",
    name: "Sale",
    description: "Discounted futons, beds, and mattresses — while supplies last.",
    collectionSlug: "sale",
    sourceSlug: "all-products",
    filter: "on-sale",
    emptyStateCopy: "No items are on sale right now. Check back soon.",
    image: "https://static.wixstatic.com/media/e04e89_9a21133f83c3412ebe88d2f232c56cf9~mv2.jpg/v1/fill/w_600,h_400,q_90/file.jpg",
  },
  {
    slug: "mattresses-sale",
    name: "Mattresses on Sale",
    description: "Current mattress promotions.",
    collectionSlug: "mattresses-sale",
    sourceSlug: "mattresses",
    filter: "on-sale",
    emptyStateCopy: "No mattresses are on sale right now. Check back soon.",
    image: "https://static.wixstatic.com/media/e04e89_9a21133f83c3412ebe88d2f232c56cf9~mv2.jpg/v1/fill/w_600,h_400,q_90/file.jpg",
  },
] as const;

export function findCategory(slug: string): ShopCategory | undefined {
  return SHOP_CATEGORIES.find((c) => c.slug === slug);
}
