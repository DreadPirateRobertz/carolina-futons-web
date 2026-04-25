import "server-only";

import { listCollectionItems } from "@/lib/wix/data";

// cf-3qt.4.1: FAQ data layer.
//
// Wix Studio backs a FAQ collection with fields {question, answer,
// category, sortOrder} per docs/cf-3qt/CMS-COLLECTION-AUDIT.md. We pull
// it via @wix/data on the server and return a {items, error?} pair so
// the page can distinguish a Wix outage from "no FAQs configured" — the
// same contract derived-products.ts established (Wix outage masquerading
// as empty-state is the bounce-trap class we explicitly guard against).
//
// FALLBACK_FAQS is a small evergreen seed used when the live collection
// returns nothing AND threw — keeps the page useful in pre-launch envs
// without coupling Vercel preview to Wix CMS being reachable.

export type FaqItem = {
  question: string;
  answer: string;
  category?: string;
  sortOrder?: number;
};

export type FaqResult = {
  items: ReadonlyArray<FaqItem>;
  // Only set when the live read failed and we fell back to the seed
  // (or returned []). Lets the page render an outage banner if it cares.
  error?: "wix_sdk" | "unexpected";
  // True when the items came from FALLBACK_FAQS rather than Wix.
  fallback?: boolean;
};

const FAQ_COLLECTION_ID = "FAQ";
const FAQ_FETCH_LIMIT = 200;

// Evergreen seed — narrow enough that a copy refresh is a normal PR.
// Order matches what shows up at the top when the live read works.
export const FALLBACK_FAQS: ReadonlyArray<FaqItem> = [
  {
    category: "Shipping",
    question: "Do you ship outside the Carolinas?",
    answer:
      "Yes — we ship futons, mattresses, and Murphy beds across the continental US. Local Hendersonville delivery is free over $1,500; outside the region we use UPS or freight depending on the piece.",
    sortOrder: 1,
  },
  {
    category: "Warranty",
    question: "What does the 15-year frame warranty cover?",
    answer:
      "Every solid-hardwood frame we sell is backed for 15 years against defects in the wood and joinery. The warranty is to the original purchaser — keep your order confirmation email as proof of purchase.",
    sortOrder: 1,
  },
  {
    category: "Returns",
    question: "Can I return a mattress?",
    answer:
      "Mattresses ship sealed and are non-returnable for hygiene reasons unless the mattress arrives damaged. Frames have a 30-day return window in original condition; contact us before shipping anything back.",
    sortOrder: 1,
  },
  {
    category: "Showroom",
    question: "Can I visit your showroom?",
    answer:
      "Yes, please. We're open Wed–Sat 10am–5pm at our Hendersonville, NC showroom. Walk-ins welcome — appointments help on busy weekends.",
    sortOrder: 1,
  },
];

function isFaqItem(record: unknown): record is FaqItem {
  if (typeof record !== "object" || record === null) return false;
  const r = record as Record<string, unknown>;
  return (
    typeof r.question === "string" &&
    r.question.length > 0 &&
    typeof r.answer === "string" &&
    r.answer.length > 0
  );
}

export async function listFaqs(): Promise<FaqResult> {
  try {
    const raw = await listCollectionItems(FAQ_COLLECTION_ID, FAQ_FETCH_LIMIT);
    const items = raw.filter(isFaqItem);
    if (items.length === 0) {
      // Empty live collection → page falls through to the seed so it
      // still renders something useful, but we mark `fallback` so the
      // page can surface a "still seeding content" notice if it cares.
      return { items: FALLBACK_FAQS, fallback: true };
    }
    return { items: sortFaqs(items) };
  } catch {
    // Don't try to classify the Wix error here — the page treats any
    // throw as "live read unavailable" and falls back. Surfacing the
    // raw error gives nothing to the user.
    return { items: FALLBACK_FAQS, error: "wix_sdk", fallback: true };
  }
}

// Stable sort: category alpha (case-insensitive), then sortOrder asc,
// then question asc. Keeps the page deterministic across reloads even
// when the Wix collection has no sortOrder set on some items.
function sortFaqs(items: ReadonlyArray<FaqItem>): ReadonlyArray<FaqItem> {
  return [...items].sort((a, b) => {
    const ca = (a.category ?? "").toLocaleLowerCase();
    const cb = (b.category ?? "").toLocaleLowerCase();
    if (ca !== cb) return ca < cb ? -1 : 1;
    const oa = typeof a.sortOrder === "number" ? a.sortOrder : Number.MAX_SAFE_INTEGER;
    const ob = typeof b.sortOrder === "number" ? b.sortOrder : Number.MAX_SAFE_INTEGER;
    if (oa !== ob) return oa - ob;
    return a.question.localeCompare(b.question);
  });
}

export type FaqGroup = {
  category: string;
  items: ReadonlyArray<FaqItem>;
};

// Group already-sorted FAQs by category for the page's <details> sections.
// Items without a category land in a single 'General' bucket at the end.
export function groupFaqsByCategory(
  items: ReadonlyArray<FaqItem>,
): ReadonlyArray<FaqGroup> {
  const buckets = new Map<string, FaqItem[]>();
  for (const item of items) {
    const key = item.category && item.category.length > 0 ? item.category : "General";
    const existing = buckets.get(key);
    if (existing) existing.push(item);
    else buckets.set(key, [item]);
  }
  return Array.from(buckets.entries()).map(([category, groupItems]) => ({
    category,
    items: groupItems,
  }));
}
