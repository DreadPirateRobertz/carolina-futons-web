export interface GuideSummary {
  slug: string;
  title: string;
  hook: string;
  readingTimeMin: number;
}

export const GUIDES: readonly GuideSummary[] = [
  {
    slug: "how-to-pick-a-futon-mattress",
    title: "How to pick a futon mattress",
    hook: "Fill types, thickness, and the tradeoff between sitting support and sleeping support.",
    readingTimeMin: 7,
  },
  {
    slug: "platform-bed-vs-futon",
    title: "Platform bed vs futon",
    hook: "When a daybed or platform frame beats a folding futon, and vice versa.",
    readingTimeMin: 5,
  },
  {
    slug: "murphy-bed-sizing",
    title: "Murphy bed sizing",
    hook: "Clearances, mattress depths, and the wall build-out you actually need.",
    readingTimeMin: 6,
  },
  {
    slug: "room-layout-for-small-spaces",
    title: "Room layout for small spaces",
    hook: "Getting a guest room and a home office out of the same 10x12.",
    readingTimeMin: 8,
  },
  {
    slug: "mattress-firmness-guide",
    title: "Mattress firmness guide",
    hook: "What soft, medium, and firm actually mean across our mattress lineup.",
    readingTimeMin: 5,
  },
  {
    slug: "warranty-and-care",
    title: "Warranty & care",
    hook: "Our 15-year frame warranty, covering fabric, and the small habits that keep a futon going.",
    readingTimeMin: 4,
  },
] as const;

export function getGuideBySlug(slug: string): GuideSummary | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export function getRelatedGuides(
  slug: string,
  count: number = 3,
): readonly GuideSummary[] {
  return GUIDES.filter((g) => g.slug !== slug).slice(0, count);
}
