export type ReviewCategory = "frames" | "mattresses" | "murphy-beds";

export interface Review {
  id: string;
  author: string;
  category: ReviewCategory;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  body: string;
  date: string; // ISO 8601
  productName: string;
}

export const REVIEW_CATEGORIES: readonly {
  value: ReviewCategory | "all";
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "frames", label: "Frames" },
  { value: "mattresses", label: "Mattresses" },
  { value: "murphy-beds", label: "Murphy Beds" },
] as const;

export const REVIEWS: readonly Review[] = [
  {
    id: "r-001",
    author: "Marcia R.",
    category: "frames",
    rating: 5,
    title: "Solid hardwood — built to last",
    body: "We've had this frame for six years and it's still rock solid. No squeaks, no wobble. Worth every dollar.",
    date: "2026-02-14",
    productName: "Classic Oak Futon Frame",
  },
  {
    id: "r-002",
    author: "James T.",
    category: "mattresses",
    rating: 5,
    title: "Comfortable for sitting and sleeping",
    body: "Guests love it and my back doesn't hate me when I nap on it. The medium-firm was the right call.",
    date: "2026-01-30",
    productName: "Heritage Futon Mattress",
  },
  {
    id: "r-003",
    author: "Linda K.",
    category: "murphy-beds",
    rating: 5,
    title: "Saved our tiny guest room",
    body: "The wall bed folds up cleanly and the cabinetry looks like built-ins. Our installer said the hardware is a cut above.",
    date: "2026-01-18",
    productName: "Studio Murphy Bed",
  },
  {
    id: "r-004",
    author: "Derek M.",
    category: "frames",
    rating: 4,
    title: "Great frame, slow delivery",
    body: "Frame itself is beautiful and the showroom team was patient. Delivery took longer than expected but it all worked out.",
    date: "2025-12-05",
    productName: "Craftsman Daybed",
  },
  {
    id: "r-005",
    author: "Priya S.",
    category: "mattresses",
    rating: 5,
    title: "Real wool, real difference",
    body: "We held off buying a mattress online for years. The wool-top layer is the comfort factor I couldn't describe until we sat on it.",
    date: "2025-11-22",
    productName: "Highland Wool Mattress",
  },
  {
    id: "r-006",
    author: "Tom & Evelyn W.",
    category: "murphy-beds",
    rating: 5,
    title: "Carolina Futons earned our second trip",
    body: "Bought a frame in 2009, came back for a Murphy bed in 2024. Same family, same straightforward answers. Rare.",
    date: "2025-10-08",
    productName: "Asheville Murphy Bed",
  },
] as const;

export function averageRating(reviews: readonly Review[]): number {
  if (reviews.length === 0) return 0;
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return sum / reviews.length;
}
