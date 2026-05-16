// cf-76a (cf-ruhm.1): static manifest of public pages for /search "Pages"
// tab. Mirrors Wix Studio prod's "Pages" search type (26 results for
// "futon" on prod). Pages search doesn't need the Wix SDK — the surface
// is a stable curated set of public routes, so a static in-repo manifest
// is the right data source.
//
// WHY in-repo and not auto-discovered: discovery would scan src/app for
// `page.tsx` files, but a meaningful "Pages" search needs editorial copy
// (title + description + keywords) shoppers don't see in the source
// imports. Keeping the manifest hand-curated keeps the search surface
// intentional — marketing pages in, member/admin/dev pages out — and
// makes search-result quality a content-style decision, not a routing
// side-effect.
//
// To add a page: append a row. To change a description: edit the row.
// Pages excluded from this manifest will NOT appear in /search?type=pages.

/**
 * A single page entry in the /search "Pages" surface.
 *
 * @property slug - The route path, beginning with `/` (e.g. `/about`, `/visit`).
 * @property title - Display title shown in search results (1-line).
 * @property description - 1-sentence summary shown under the title.
 * @property keywords - Optional extra terms the page should match against.
 *   Use for synonyms / shopper vocabulary the title+description don't cover
 *   (e.g. /visit might add `["showroom", "directions"]`).
 */
export type SearchPage = {
  slug: string;
  title: string;
  description: string;
  keywords?: ReadonlyArray<string>;
};

/**
 * Curated set of public pages searchable via /search?type=pages.
 *
 * Excludes: member/admin routes (private), noindex routes (cart, order
 * confirmation, theme-{a,b,c,d}, winback, wishlist-share/[token]), auth
 * routes (account, signup), and dev-only routes (smoke).
 */
export const PAGES: ReadonlyArray<SearchPage> = [
  {
    slug: "/about",
    title: "About Carolina Futons",
    description:
      "Family-owned futon and natural-mattress retailer in Hendersonville, North Carolina since 1991.",
    keywords: ["story", "family", "history", "1991", "hendersonville"],
  },
  {
    slug: "/accessibility",
    title: "Accessibility Statement",
    description:
      "Our commitment to WCAG 2.1 AA accessibility on carolinafutons.com.",
    keywords: ["a11y", "wcag", "screen reader", "ada"],
  },
  {
    slug: "/blog",
    title: "Journal",
    description:
      "Articles, buying guides, and stories from the Carolina Futons showroom.",
    keywords: ["articles", "posts", "news"],
  },
  {
    slug: "/community-gallery",
    title: "Community Gallery",
    description:
      "Real Carolina Futons in real homes — photos submitted by customers.",
    keywords: ["photos", "real homes", "customer photos", "gallery"],
  },
  {
    slug: "/community-gallery/submit",
    title: "Share Your Photo",
    description:
      "Submit a photo of your Carolina Futons setup to the community gallery.",
    keywords: ["submit", "photo", "upload"],
  },
  {
    slug: "/compare",
    title: "Compare Products",
    description:
      "Side-by-side comparison of up to four futon frames or mattresses.",
    keywords: ["side by side", "vs", "comparison"],
  },
  {
    slug: "/contact",
    title: "Contact",
    description:
      "Reach the Carolina Futons team with questions about frames, mattresses, delivery, or warranty.",
    keywords: ["email", "phone", "support", "help"],
  },
  {
    slug: "/design-a-room",
    title: "Design a Room",
    description:
      "Plan your room around a Carolina Futons piece — drag-and-drop layout tool.",
    keywords: ["layout", "planner", "room planner"],
  },
  {
    slug: "/faq",
    title: "Frequently Asked Questions",
    description:
      "Common questions about shipping, warranty, returns, and showroom hours.",
    keywords: ["help", "questions", "answers"],
  },
  {
    slug: "/futon-sommelier",
    title: "Futon Sommelier",
    description:
      "A guided quiz that recommends the right futon mattress for how you sleep.",
    keywords: ["quiz", "recommend", "find a futon", "sommelier"],
  },
  {
    slug: "/getting-it-home",
    title: "Getting It Home",
    description:
      "Delivery zones, shipping rates, and white-glove options — by zip code.",
    keywords: ["delivery", "shipping", "white glove", "freight", "zip"],
  },
  {
    slug: "/gift-cards",
    title: "Gift Cards",
    description:
      "Give the gift of a great night's sleep — digital and physical gift cards.",
    keywords: ["gift card", "present", "voucher"],
  },
  {
    slug: "/gift-registry",
    title: "Gift Registry",
    description:
      "Build a Carolina Futons gift registry for your wedding, housewarming, or baby shower.",
    keywords: ["wedding", "housewarming", "baby shower", "registry"],
  },
  {
    slug: "/guides",
    title: "Buying Guides",
    description:
      "Frame materials, mattress types, sizing — everything you need to pick the right futon.",
    keywords: ["guide", "buying guide", "how to choose"],
  },
  {
    slug: "/press",
    title: "Press & Media",
    description:
      "Press resources, story angles, and a direct line to Carolina Futons for journalists.",
    keywords: ["press", "media", "journalists", "interview"],
  },
  {
    slug: "/privacy",
    title: "Privacy Policy",
    description:
      "How Carolina Futons collects, uses, and protects the information you share.",
    keywords: ["privacy", "cookies", "data", "consent"],
  },
  {
    slug: "/referral",
    title: "Referral Program",
    description:
      "Share your referral link and earn store credit when friends place their first order.",
    keywords: ["referral", "refer a friend", "store credit"],
  },
  {
    slug: "/returns",
    title: "Returns",
    description:
      "30-day return window on most items. Custom-made and clearance items are final sale.",
    keywords: ["return", "refund", "exchange", "30 day"],
  },
  {
    slug: "/reviews",
    title: "Reviews",
    description:
      "Customer reviews of Carolina Futons frames, mattresses, and showroom experience.",
    keywords: ["reviews", "ratings", "testimonials"],
  },
  {
    slug: "/shipping",
    title: "Shipping",
    description:
      "Shipping rates, delivery windows, and white-glove options.",
    keywords: ["delivery", "freight", "shipping rates"],
  },
  {
    slug: "/shop",
    title: "Shop",
    description:
      "Browse all futon frames, mattresses, Murphy beds, and platform beds.",
    keywords: ["browse", "all products", "catalog"],
  },
  {
    slug: "/style-quiz",
    title: "Style Quiz",
    description:
      "A quick quiz that pairs your taste with the right Carolina Futons collection.",
    keywords: ["quiz", "style", "taste", "recommend"],
  },
  {
    slug: "/sustainability",
    title: "Sustainability",
    description:
      "American-made hardwood frames, natural fibers, and a 15-year warranty built for repair, not replacement.",
    keywords: ["sustainable", "eco", "natural fiber", "american made"],
  },
  {
    slug: "/swatch-request",
    title: "Swatch Request",
    description:
      "Request free fabric swatches before you commit to a frame.",
    keywords: ["swatch", "fabric sample", "free sample"],
  },
  {
    slug: "/terms",
    title: "Terms of Service",
    description:
      "The terms that govern your use of carolinafutons.com and any purchase you make through the site.",
    keywords: ["legal", "terms", "tos"],
  },
  {
    slug: "/videos",
    title: "Product Videos",
    description:
      "Watch our futon frames, Murphy beds, and conversion mechanisms in action.",
    keywords: ["video", "demo", "how to", "assembly"],
  },
  {
    slug: "/visit",
    title: "Visit Us",
    description:
      "Carolina Futons showroom in Hendersonville, NC — hours, directions, parking.",
    keywords: ["showroom", "directions", "hours", "in store", "hendersonville"],
  },
  {
    slug: "/warranty",
    title: "Warranty",
    description:
      "15-year frame warranty plus per-product mattress warranties — what's covered and how to claim.",
    keywords: ["warranty", "guarantee", "claim", "15 year"],
  },
];

/**
 * Case-insensitive substring search across page title + description + keywords.
 *
 * Returns pages whose joined haystack (title + description + keywords) contains
 * `q`. Empty/whitespace `q` returns `[]` (the caller renders the guided empty
 * state, same contract as `searchProducts` / `searchPosts`).
 *
 * @param q - User-typed search query.
 * @param limit - Maximum number of matches to return (default 12).
 * @returns Matching pages, ordered by their position in `PAGES` (the
 *   manifest's curatorial ordering); empty array for empty / whitespace
 *   `q` or zero matches.
 *
 * WHY: Pages search is curated content, not a generated index. The
 * caller can rank later if shopper-vocabulary mismatches surface in
 * analytics; for v1 we trust the manifest order.
 */
export function searchPages(q: string, limit = 12): SearchPage[] {
  const trimmed = q.trim();
  if (!trimmed) return [];
  const lower = trimmed.toLowerCase();
  return PAGES.filter((p) => {
    const haystack = `${p.title} ${p.description} ${(p.keywords ?? []).join(" ")}`.toLowerCase();
    return haystack.includes(lower);
  }).slice(0, limit);
}
