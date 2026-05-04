// Fixture collections matching the fixture product collectionIds.
// No import from @/lib/wix/products to avoid a circular type reference.
// Callers in wix/products.ts cast the returned values to WixCollection.

export const FIXTURE_COLLECTIONS = [
  { _id: "fixture-col-all",           slug: "all-products",        name: "All Products",          numberOfProducts: 7 },
  { _id: "fixture-col-futon-frames",  slug: "futon-frames",        name: "Futon Frames",          numberOfProducts: 2 },
  { _id: "fixture-col-murphy-beds",   slug: "murphy-cabinet-beds", name: "Murphy Cabinet Beds",   numberOfProducts: 3 },
  { _id: "fixture-col-mattresses",    slug: "mattresses",          name: "Mattresses",            numberOfProducts: 1 },
  { _id: "fixture-col-platform-beds", slug: "platform-beds",       name: "Platform Beds",         numberOfProducts: 1 },
];

export function getFixtureCollectionBySlug(slug: string) {
  return FIXTURE_COLLECTIONS.find((c) => c.slug === slug) ?? null;
}
