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

// cfw-dv5: sub-category pill filter entry. `nameContains` is a case-insensitive
// substring checked against product.name to determine membership. Kept simple
// (no regex, no tag system) so the store owner can tune by editing this file.
export type Subcategory = {
  slug: string;
  name: string;
  nameContains: string;
};

/**
 * Curated "featured" row config for a PLP (cfw-75v / cf-mirror-ee1).
 *
 * When a category sets `featured`, the PLP renders an editorial strip ABOVE
 * the main grid on page 1 with default sort and no active filters. The strip
 * pulls 3 hand-picked products by slug; the page resolves them in parallel via
 * `getProductBySlug` and renders the row only when all 3 resolve — graceful
 * fallback hides the strip if any slug is missing from the live catalog.
 *
 * Editorial copy is hardcoded for v1; future iterations may move it to
 * SiteContent so Brenda can edit without a deploy (mirroring the visit-page
 * pattern in `src/app/visit/page.tsx`).
 *
 * @see docs/visual-parity-audit-2026-05-09.md §3 (the source spec)
 */
export type FeaturedRowConfig = {
  /** Small uppercase label above the heading (e.g. "Editor's picks"). */
  eyebrow: string;
  /** Section heading rendered as `<h2>` for SEO + a11y outline. */
  heading: string;
  /** ~1–2 sentence editorial blurb under the heading. */
  body: string;
  /** Exactly 3 product slugs in display order. */
  productSlugs: readonly [string, string, string];
};

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
  // cfw-dv5: optional pill-filter sub-categories rendered above the PLP grid.
  subcategories?: readonly Subcategory[];
  // Optional curated "featured" row config — see FeaturedRowConfig above. When
  // omitted the PLP renders without the strip (default behavior, unchanged).
  featured?: FeaturedRowConfig;
};

export const SHOP_CATEGORIES: readonly ShopCategory[] = [
  {
    slug: "futon-frames",
    name: "Futon Frames",
    description:
      "Choose from twin, full, or queen hardwood frames, with varying seat heights, finishes, and conversion mechanisms. Some models offer chair, full, and queen chairs with ottoman options.",
    collectionSlug: "futon-frames",
    image: "https://static.wixstatic.com/media/e04e89_4bea49a709a3470a8315b5acd7309b0f~mv2.jpg/v1/fill/w_600,h_400,q_90/file.jpg",
    subcategories: [
      { slug: "front-loading-nesting", name: "Front Loading & Nesting", nameContains: "Front Load" },
      { slug: "wall-huggers", name: "Wall Huggers", nameContains: "Wall Hugger" },
      { slug: "unfinished-wood", name: "Unfinished Wood", nameContains: "Unfinished" },
      { slug: "rustic-log", name: "Rustic Log", nameContains: "Rustic Log" },
    ],
    // cfw-75v: 3 hand-picked frames anchoring the editorial row at the top of
    // the futon-frames PLP. Slugs are verified-real (test fixtures + audit
    // references); if any goes out-of-catalog the row hides itself rather
    // than rendering a partial strip.
    featured: {
      eyebrow: "Editor's picks",
      heading: "Where most people start",
      body: "Three frames that cover the common questions — daily-use durability, conversion mechanism, and finish. Sit on them in the showroom or order with our 100-night guarantee.",
      productSlugs: [
        "kingston-futon-frame",
        "sedona-futon-frame",
        "asheville-futon-frame",
      ] as const,
    },
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
    // cfw-75v: featured-row slot for mattresses is intentionally LEFT EMPTY
    // pending owner (Stilgar / Brenda) confirmation of the canonical 3-slug
    // pick. Adding placeholder slugs that don't resolve would just hide the
    // row at runtime (graceful fallback) — populate this `featured` block
    // when the 3 mattresses are chosen and the slugs verified live.
    // featured: { eyebrow, heading, body, productSlugs: [s1, s2, s3] },
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
