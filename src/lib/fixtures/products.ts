// Fixture product catalog for NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1 mode.
// Used on Vercel preview builds so QA can exercise cart/checkout/shipping/
// white-glove flows without depending on the production Wix catalog.
// These IDs intentionally start with "fixture-" so they never collide with
// real Wix product IDs and any accidental prod leak is immediately obvious.
//
// Coverage matrix:
//   kingston-futon-frame        — futon frame, ~$399, parcel, in-stock, 2 options (frame/mattress)
//   asheville-murphy-bed        — murphy bed, ~$849, LTL freight, in-stock, 1 option (finish)
//   cube-murphy-cabinet-bed     — murphy bed, ~$1,199, LTL freight, in-stock, 1 option (finish)
//   ranchero-murphy-cabinet-bed — murphy bed, ~$2,978, LTL freight, in-stock, 1 option (finish)
//   mesa-foam-mattress          — mattress, ~$119, parcel, in-stock, 1 option (size)
//   monterey-platform-bed       — platform bed, ~$1,699, white-glove eligible, in-stock
//   blue-ridge-sofa-bed         — sofa bed, ~$799, parcel/LTL, in-stock, 1 option (upholstery)
//   sedona-futon-frame-oos      — futon frame, out-of-stock (notify-me flow)

// No import from @/lib/wix/products — that module imports from here and
// importing WixProduct back would create a circular type reference.
// Callers in wix/products.ts cast the returned array to WixProduct[].

const PLACEHOLDER =
  "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop";

function makeProduct(
  id: string,
  slug: string,
  name: string,
  description: string,
  price: number,
  stock: { trackInventory: boolean; inStock: boolean; quantity?: number },
  productOptions: unknown[],
  variants: unknown[],
  collectionIds: string[],
  priceRangeMax?: number,
  discountedPrice?: number,
) {
  return {
    _id: `fixture-${id}`,
    slug,
    name,
    description,
    priceData: {
      price,
      discountedPrice: discountedPrice ?? null,
      formatted: { price: `$${price.toFixed(2)}` },
    },
    priceRange: {
      minValue: price,
      maxValue: priceRangeMax ?? price,
    },
    stock,
    media: {
      mainMedia: {
        image: { url: PLACEHOLDER, width: 800, height: 600 },
      },
      items: [
        {
          image: { url: PLACEHOLDER, width: 800, height: 600 },
          mediaType: "IMAGE",
        },
      ],
    },
    productOptions,
    variants,
    collectionIds,
    productType: "physical",
    weight: 60,
    _createdDate: new Date("2024-01-01"),
    _updatedDate: new Date("2024-01-01"),
  };
}

// --- Kingston Futon Frame (~$399 → $319 sale, parcel, in-stock, 2 options) ---
const KINGSTON = makeProduct(
  "kingston-futon-frame",
  "kingston-futon-frame",
  "Kingston Futon Frame",
  "A classic hardwood futon frame with clean lines. Ships assembled to most US addresses.",
  399,
  { trackInventory: true, inStock: true, quantity: 12 },
  [
    {
      name: "Frame Color",
      optionType: "color" as const,
      choices: [
        { description: "Natural", value: "Natural", inStock: true },
        { description: "Espresso", value: "Espresso", inStock: true },
      ],
    },
    {
      name: "Include Mattress",
      optionType: "drop_down" as const,
      choices: [
        { description: "Frame Only", value: "Frame Only", inStock: true },
        { description: "With Mesa Mattress (+$119)", value: "With Mesa Mattress", inStock: true },
      ],
    },
  ],
  [
    {
      _id: "fixture-var-k1",
      choices: { "Frame Color": "Natural", "Include Mattress": "Frame Only" },
      stock: { trackQuantity: true, inStock: true, quantity: 6 },
      variant: { priceData: { price: 399 } },
    },
    {
      _id: "fixture-var-k2",
      choices: { "Frame Color": "Natural", "Include Mattress": "With Mesa Mattress" },
      stock: { trackQuantity: true, inStock: true, quantity: 6 },
      variant: { priceData: { price: 518 } },
    },
    {
      _id: "fixture-var-k3",
      choices: { "Frame Color": "Espresso", "Include Mattress": "Frame Only" },
      stock: { trackQuantity: true, inStock: true, quantity: 6 },
      variant: { priceData: { price: 399 } },
    },
    {
      _id: "fixture-var-k4",
      choices: { "Frame Color": "Espresso", "Include Mattress": "With Mesa Mattress" },
      stock: { trackQuantity: true, inStock: true, quantity: 6 },
      variant: { priceData: { price: 518 } },
    },
  ],
  ["fixture-col-futon-frames", "fixture-col-all"],
  undefined,
  319,
);

// --- Asheville Murphy Bed (~$849, LTL freight, in-stock, 1 option) ---
const ASHEVILLE = makeProduct(
  "asheville-murphy-bed",
  "asheville-murphy-bed",
  "Asheville Murphy Cabinet Bed",
  "Wall-bed in solid wood cabinet. Ships LTL freight — threshold delivery included.",
  849,
  { trackInventory: true, inStock: true, quantity: 4 },
  [
    {
      name: "Finish",
      optionType: "drop_down" as const,
      choices: [
        { description: "White", value: "White", inStock: true },
        { description: "Walnut", value: "Walnut", inStock: true },
      ],
    },
  ],
  [
    {
      _id: "fixture-var-a1",
      choices: { Finish: "White" },
      stock: { trackQuantity: true, inStock: true, quantity: 2 },
      variant: { priceData: { price: 849 } },
    },
    {
      _id: "fixture-var-a2",
      choices: { Finish: "Walnut" },
      stock: { trackQuantity: true, inStock: true, quantity: 2 },
      variant: { priceData: { price: 849 } },
    },
  ],
  ["fixture-col-murphy-beds", "fixture-col-all"],
);

// --- Cube Murphy Cabinet Bed (~$1,199, LTL freight, in-stock, 1 option) ---
const CUBE = makeProduct(
  "cube-murphy-cabinet-bed",
  "cube-murphy-cabinet-bed",
  "Cube Murphy Cabinet Bed",
  "Night & Day Cube murphy bed — queen size folds into a free-standing cabinet. Ships LTL freight.",
  1199,
  { trackInventory: true, inStock: true, quantity: 3 },
  [
    {
      name: "Finish",
      optionType: "drop_down" as const,
      choices: [
        { description: "White", value: "White", inStock: true },
        { description: "Espresso", value: "Espresso", inStock: true },
      ],
    },
  ],
  [
    {
      _id: "fixture-var-cu1",
      choices: { Finish: "White" },
      stock: { trackQuantity: true, inStock: true, quantity: 2 },
      variant: { priceData: { price: 1199 } },
    },
    {
      _id: "fixture-var-cu2",
      choices: { Finish: "Espresso" },
      stock: { trackQuantity: true, inStock: true, quantity: 1 },
      variant: { priceData: { price: 1199 } },
    },
  ],
  ["fixture-col-murphy-beds", "fixture-col-all"],
);

// --- Ranchero Murphy Cabinet Bed (~$2,978, LTL freight, in-stock, 1 option) ---
const RANCHERO = makeProduct(
  "ranchero-murphy-cabinet-bed",
  "ranchero-murphy-cabinet-bed",
  "Ranchero Murphy Cabinet Bed",
  "Night & Day Ranchero murphy cabinet bed — full Murphy bed in a solid wood cabinet with storage.",
  2978,
  { trackInventory: true, inStock: true, quantity: 2 },
  [
    {
      name: "Finish",
      optionType: "drop_down" as const,
      choices: [
        { description: "White", value: "White", inStock: true },
        { description: "Walnut", value: "Walnut", inStock: true },
      ],
    },
  ],
  [
    {
      _id: "fixture-var-r1",
      choices: { Finish: "White" },
      stock: { trackQuantity: true, inStock: true, quantity: 1 },
      variant: { priceData: { price: 2978 } },
    },
    {
      _id: "fixture-var-r2",
      choices: { Finish: "Walnut" },
      stock: { trackQuantity: true, inStock: true, quantity: 1 },
      variant: { priceData: { price: 2978 } },
    },
  ],
  ["fixture-col-murphy-beds", "fixture-col-all"],
);

// --- Mesa Foam Mattress (~$119 → $89 sale, parcel, in-stock, 1 option) ---
const MESA = makeProduct(
  "mesa-foam-mattress",
  "mesa-foam-mattress",
  "Mesa Futon Mattress",
  "6-inch foam futon mattress. Compresses for easy shipping — expands in 24 hours.",
  119,
  { trackInventory: true, inStock: true, quantity: 30 },
  [
    {
      name: "Size",
      optionType: "drop_down" as const,
      choices: [
        { description: "Full (54\" × 75\")", value: "Full", inStock: true },
        { description: "Queen (60\" × 80\")", value: "Queen", inStock: true },
      ],
    },
  ],
  [
    {
      _id: "fixture-var-m1",
      choices: { Size: "Full" },
      stock: { trackQuantity: true, inStock: true, quantity: 15 },
      variant: { priceData: { price: 119 } },
    },
    {
      _id: "fixture-var-m2",
      choices: { Size: "Queen" },
      stock: { trackQuantity: true, inStock: true, quantity: 15 },
      variant: { priceData: { price: 139 } },
    },
  ],
  ["fixture-col-mattresses", "fixture-col-all"],
  139,
  89,
);

// --- Monterey Platform Bed (~$1,699 → $1,399 sale, white-glove eligible) ---
// priceData.price > WHITE_GLOVE_THRESHOLD_CENTS/100 ($1,500) so the white-glove
// widget renders on its PDP.
const MONTEREY = makeProduct(
  "monterey-platform-bed",
  "monterey-platform-bed",
  "Monterey Platform Bed",
  "Solid hardwood platform bed with integrated headboard. White-glove in-home setup included.",
  1699,
  { trackInventory: true, inStock: true, quantity: 2 },
  [
    {
      name: "Size",
      optionType: "drop_down" as const,
      choices: [
        { description: "Queen", value: "Queen", inStock: true },
        { description: "King", value: "King", inStock: true },
      ],
    },
  ],
  [
    {
      _id: "fixture-var-p1",
      choices: { Size: "Queen" },
      stock: { trackQuantity: true, inStock: true, quantity: 1 },
      variant: { priceData: { price: 1699 } },
    },
    {
      _id: "fixture-var-p2",
      choices: { Size: "King" },
      stock: { trackQuantity: true, inStock: true, quantity: 1 },
      variant: { priceData: { price: 1899 } },
    },
  ],
  ["fixture-col-platform-beds", "fixture-col-all"],
  1899,
  1399,
);

// --- Blue Ridge Sofa Bed (~$799, parcel/LTL, in-stock) ---
const BLUE_RIDGE = makeProduct(
  "blue-ridge-sofa-bed",
  "blue-ridge-sofa-bed",
  "Blue Ridge Sofa Bed",
  "Solid hardwood sofa bed — comfortable seating by day, full guest bed by night. Easy flip mechanism.",
  799,
  { trackInventory: true, inStock: true, quantity: 5 },
  [
    {
      name: "Upholstery",
      optionType: "drop_down" as const,
      choices: [
        { description: "Charcoal", value: "Charcoal", inStock: true },
        { description: "Sage", value: "Sage", inStock: true },
      ],
    },
  ],
  [
    {
      _id: "fixture-var-br1",
      choices: { Upholstery: "Charcoal" },
      stock: { trackQuantity: true, inStock: true, quantity: 3 },
      variant: { priceData: { price: 799 } },
    },
    {
      _id: "fixture-var-br2",
      choices: { Upholstery: "Sage" },
      stock: { trackQuantity: true, inStock: true, quantity: 2 },
      variant: { priceData: { price: 799 } },
    },
  ],
  ["fixture-col-sofa-beds", "fixture-col-all"],
);

// --- Sedona Futon Frame (out-of-stock — triggers notify-me flow) ---
const SEDONA = makeProduct(
  "sedona-futon-frame-oos",
  "sedona-futon-frame-oos",
  "Sedona Futon Frame",
  "A premium solid oak futon frame. Currently out of stock — sign up to be notified when available.",
  549,
  { trackInventory: true, inStock: false, quantity: 0 },
  [
    {
      name: "Frame Color",
      optionType: "color" as const,
      choices: [
        { description: "Natural Oak", value: "Natural Oak", inStock: false },
      ],
    },
  ],
  [
    {
      _id: "fixture-var-s1",
      choices: { "Frame Color": "Natural Oak" },
      stock: { trackQuantity: true, inStock: false, quantity: 0 },
      variant: { priceData: { price: 549 } },
    },
  ],
  ["fixture-col-futon-frames", "fixture-col-all"],
);

export const FIXTURE_PRODUCTS = [
  KINGSTON,
  ASHEVILLE,
  CUBE,
  RANCHERO,
  MESA,
  MONTEREY,
  BLUE_RIDGE,
  SEDONA,
];

export function getFixtureProductBySlug(slug: string) {
  return FIXTURE_PRODUCTS.find((p) => p.slug === slug) ?? null;
}
