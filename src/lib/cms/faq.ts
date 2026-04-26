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
// Keep sortOrder values dense and sequential within each category so
// the stable sort in sortFaqs() produces a predictable page layout.
export const FALLBACK_FAQS: ReadonlyArray<FaqItem> = [
  // ── Products ──────────────────────────────────────────────────────────
  {
    category: "Products",
    question: "What futon sizes do you carry?",
    answer:
      "We stock Twin, Full, Queen, and King futon frames and mattresses. Full (54″ wide) is our best-seller for guest rooms; Queen fits most standard bedroom spaces and works well as a primary sofa.",
    sortOrder: 1,
  },
  {
    category: "Products",
    question: "What's the difference between a bifold and trifold frame?",
    answer:
      "A bifold frame folds in one place and sits lower to the floor as a sofa — great for a modern, streamlined look. A trifold folds in two places, sitting higher as a sofa and giving a more traditional futon profile. Both convert fully flat for sleeping.",
    sortOrder: 2,
  },
  {
    category: "Products",
    question: "Are your frames American-made?",
    answer:
      "Yes. Every solid-hardwood frame we sell is crafted in the US — primarily from sustainably harvested oak, maple, and cherry. We've carried American-made frames exclusively since we opened in 1991.",
    sortOrder: 3,
  },
  {
    category: "Products",
    question: "What wood species do you offer?",
    answer:
      "Most of our frames come in oak, maple, and cherry. A smaller selection is available in pine for a lighter, cottage feel. Stain options vary by manufacturer — our showroom floor has live samples of every finish we stock.",
    sortOrder: 4,
  },
  // ── Mattresses ────────────────────────────────────────────────────────
  {
    category: "Mattresses",
    question: "What mattress thickness should I choose?",
    answer:
      "6-inch mattresses work well for occasional use and sit lower on the frame. 8-inch is our most popular all-purpose choice. 10-inch mattresses feel closest to a traditional bed and are best for primary sleepers. Thicker mattresses are slightly harder to fold the frame with.",
    sortOrder: 1,
  },
  {
    category: "Mattresses",
    question: "Do you carry innerspring futon mattresses?",
    answer:
      "Yes — we stock both foam-core and innerspring options. Innerspring mattresses feel firmer and more bed-like; foam-core mattresses compress more evenly and are lighter to move. We're happy to let you try both in the showroom.",
    sortOrder: 2,
  },
  {
    category: "Mattresses",
    question: "Can I use a regular bed mattress on a futon frame?",
    answer:
      "Standard mattresses are too rigid to fold with the frame and will void the frame warranty if used that way. Futon mattresses are specifically constructed to flex at the fold point. We carry mattresses in all standard futon sizes.",
    sortOrder: 3,
  },
  // ── Shipping ──────────────────────────────────────────────────────────
  {
    category: "Shipping",
    question: "Do you ship outside the Carolinas?",
    answer:
      "Yes — we ship futons, mattresses, and Murphy beds across the continental US. Local Hendersonville delivery is free over $1,500; outside the region we use UPS or freight depending on the piece.",
    sortOrder: 1,
  },
  {
    category: "Shipping",
    question: "How long does delivery take?",
    answer:
      "In-stock items typically ship within 2–3 business days. UPS ground delivery adds 3–7 days depending on destination. Freight shipments for larger pieces take 5–10 business days. We email a tracking number as soon as the carrier picks up.",
    sortOrder: 2,
  },
  {
    category: "Shipping",
    question: "Do you offer assembly or white-glove delivery?",
    answer:
      "White-glove delivery — including in-home placement and assembly — is available on orders over $1,500 within our local delivery zone. For out-of-region orders, frames ship flat-packed with printed assembly instructions; most customers assemble in under 30 minutes.",
    sortOrder: 3,
  },
  // ── Returns ───────────────────────────────────────────────────────────
  {
    category: "Returns",
    question: "Can I return a mattress?",
    answer:
      "Mattresses ship sealed and are non-returnable for hygiene reasons unless the mattress arrives damaged. Frames have a 30-day return window in original condition; contact us before shipping anything back.",
    sortOrder: 1,
  },
  {
    category: "Returns",
    question: "What if my order arrives damaged?",
    answer:
      "Document any damage with photos before signing for the delivery, then email us at carolinafutons@gmail.com within 48 hours. We'll file the freight claim and ship a replacement or issue a full refund — whichever you prefer.",
    sortOrder: 2,
  },
  // ── Warranty ──────────────────────────────────────────────────────────
  {
    category: "Warranty",
    question: "What does the 15-year frame warranty cover?",
    answer:
      "Every solid-hardwood frame we sell is backed for 15 years against defects in the wood and joinery. The warranty is to the original purchaser — keep your order confirmation email as proof of purchase.",
    sortOrder: 1,
  },
  {
    category: "Warranty",
    question: "Are mattresses covered by the same warranty?",
    answer:
      "Mattresses carry a separate 1-year manufacturer warranty against defects in materials and stitching. Normal softening of foam or innerspring compression over time is expected and is not a defect. Contact us with photos if you suspect a manufacturing issue.",
    sortOrder: 2,
  },
  // ── Payment ───────────────────────────────────────────────────────────
  {
    category: "Payment",
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards (Visa, Mastercard, Amex, Discover), PayPal, Apple Pay, and Google Pay online. In the showroom we also accept cash and personal checks.",
    sortOrder: 1,
  },
  {
    category: "Payment",
    question: "Do you offer financing?",
    answer:
      "Yes — we offer 0% APR financing through Shop Pay Installments on orders over $200. At checkout, select Shop Pay and choose a 4-, 8-, or 12-week payment plan. Longer-term plans may involve interest; terms are shown before you confirm.",
    sortOrder: 2,
  },
  // ── Showroom ──────────────────────────────────────────────────────────
  {
    category: "Showroom",
    question: "Can I visit your showroom?",
    answer:
      "Yes, please. We're open Wed–Sat 10am–5pm at our Hendersonville, NC showroom. Walk-ins welcome — appointments help on busy weekends.",
    sortOrder: 1,
  },
  {
    category: "Showroom",
    question: "Where are you located, and is there parking?",
    answer:
      "We're at 321 N. Main St., Hendersonville, NC 28792 — about 25 miles south of Asheville on US-64. Free parking is available in the lot directly behind the building, accessible from 4th Ave E.",
    sortOrder: 2,
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
