// Fixture Wix-style collection objects — mirrors the shape returned by
// client.collections.getCollectionBySlug().

export const FIXTURE_COLLECTIONS = [
  {
    _id: "fixture-col-futon-frames",
    name: "Futon Frames",
    slug: "futon-frames",
    description: "Hardwood futon frames made in North Carolina.",
  },
  {
    _id: "fixture-col-murphy-beds",
    name: "Murphy Cabinet Beds",
    slug: "murphy-cabinet-beds",
    description: "Cabinet beds that fold away without hardware in the wall.",
  },
  {
    _id: "fixture-col-platform-beds",
    name: "Platform Beds",
    slug: "platform-beds",
    description: "Low-profile solid-wood platform beds.",
  },
  {
    _id: "fixture-col-mattresses",
    name: "Mattresses",
    slug: "mattresses",
    description: "Futon mattresses and bed mattresses.",
  },
  {
    _id: "fixture-col-all",
    name: "All Products",
    slug: "all-products",
    description: "All Carolina Futons products.",
  },
] as const;

export type FixtureCollection = (typeof FIXTURE_COLLECTIONS)[number];

export function getFixtureCollectionBySlug(
  slug: string,
): FixtureCollection | null {
  return (
    (FIXTURE_COLLECTIONS as readonly FixtureCollection[]).find(
      (c) => c.slug === slug,
    ) ?? null
  );
}
