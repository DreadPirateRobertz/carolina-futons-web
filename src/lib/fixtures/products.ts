// Fixture product catalog for NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1 mode.
// IDs start with "fixture-" so they never collide with real Wix product IDs.
// Used on Vercel preview builds and local dev when Wix credentials aren't set.

const PLACEHOLDER =
  "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop";

function makeProduct(
  id: string,
  slug: string,
  name: string,
  description: string,
  price: number,
  inStock: boolean,
  collectionIds: string[],
  priceRangeMax?: number,
) {
  return {
    _id: `fixture-${id}`,
    slug,
    name,
    description,
    priceData: {
      price,
      currency: "USD",
      formatted: { price: `$${price.toFixed(2)}`, compareAtPrice: undefined },
    },
    priceRange: { minValue: price, maxValue: priceRangeMax ?? price },
    stock: { trackInventory: true, inStock, quantity: inStock ? 12 : 0 },
    media: {
      mainMedia: { image: { url: PLACEHOLDER, width: 800, height: 600 } },
      items: [{ image: { url: PLACEHOLDER, width: 800, height: 600 } }],
    },
    collectionIds,
    lastUpdated: new Date("2026-04-01").toISOString(),
  };
}

export const FIXTURE_PRODUCTS = [
  makeProduct(
    "kingston-futon-frame",
    "kingston-futon-frame",
    "Kingston Futon Frame",
    "Solid hardwood futon frame with a clean mission-style design. Converts from sofa to full bed in seconds.",
    399,
    true,
    ["fixture-col-futon-frames", "fixture-col-all"],
    499,
  ),
  makeProduct(
    "lexington-futon-frame",
    "lexington-futon-frame",
    "Lexington Futon Frame",
    "Plantation rubberwood frame with low-VOC finish. Seat height 18\". Ships fully assembled.",
    549,
    true,
    ["fixture-col-futon-frames", "fixture-col-all"],
  ),
  makeProduct(
    "carolina-futon-frame",
    "carolina-futon-frame",
    "Carolina Futon Frame",
    "Our flagship solid-oak futon frame. Built to last 20 years of daily use. FSC-certified wood.",
    749,
    true,
    ["fixture-col-futon-frames", "fixture-col-all"],
    899,
  ),
  makeProduct(
    "asheville-futon-frame",
    "asheville-futon-frame",
    "Asheville Futon Frame",
    "Contemporary slat-back futon frame in maple or cherry. Low-VOC water-based finish.",
    649,
    true,
    ["fixture-col-futon-frames", "fixture-col-all"],
  ),
  makeProduct(
    "highlands-futon-frame-oos",
    "highlands-futon-frame",
    "Highlands Futon Frame",
    "Heirloom-grade solid-cherry futon frame. Hand-sanded, hand-oiled. Limited run.",
    1199,
    false,
    ["fixture-col-futon-frames", "fixture-col-all"],
  ),
  makeProduct(
    "asheville-murphy-bed",
    "asheville-murphy-bed",
    "Asheville Murphy Cabinet Bed",
    "Cabinet bed that folds away without wall hardware. Queen mattress included.",
    849,
    true,
    ["fixture-col-murphy-beds", "fixture-col-all"],
    1099,
  ),
  makeProduct(
    "mesa-foam-mattress",
    "mesa-foam-mattress",
    "Mesa Foam Futon Mattress",
    "CertiPUR-US certified foam mattress for futon frames. Full size.",
    119,
    true,
    ["fixture-col-mattresses", "fixture-col-all"],
  ),
  makeProduct(
    "monterey-platform-bed",
    "monterey-platform-bed",
    "Monterey Platform Bed",
    "Low-profile solid-pine platform bed. No box spring needed. Queen and King sizes.",
    1699,
    true,
    ["fixture-col-platform-beds", "fixture-col-all"],
    1899,
  ),
] as const;

export type FixtureProduct = (typeof FIXTURE_PRODUCTS)[number];

export function getFixtureProductBySlug(slug: string): FixtureProduct | null {
  return (
    (FIXTURE_PRODUCTS as readonly FixtureProduct[]).find(
      (p) => p.slug === slug,
    ) ?? null
  );
}
