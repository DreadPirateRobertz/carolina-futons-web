import { describe, it, expect, vi, beforeEach } from "vitest";

// cf-3qt.4.1: faq data layer — fallback semantics + sort + grouping.
//
// listCollectionItems is mocked so the test never reaches the Wix
// client. The contract: live read with valid items → return them
// sorted; empty live read → fallback to FALLBACK_FAQS with
// fallback=true; thrown live read → fallback + error="wix_sdk".

const listCollectionItems = vi.fn();
vi.mock("@/lib/wix/data", () => ({
  listCollectionItems: (...args: unknown[]) =>
    listCollectionItems(...args),
}));

import {
  FALLBACK_FAQS,
  groupFaqsByCategory,
  listFaqs,
  type FaqItem,
} from "@/lib/cms/faq";

beforeEach(() => {
  listCollectionItems.mockReset();
});

describe("listFaqs", () => {
  it("returns sorted items when the live read returns valid FAQs", async () => {
    const live: FaqItem[] = [
      { category: "Returns", question: "B", answer: "b", sortOrder: 2 },
      { category: "Shipping", question: "A", answer: "a", sortOrder: 1 },
      { category: "Returns", question: "A", answer: "a", sortOrder: 1 },
    ];
    listCollectionItems.mockResolvedValueOnce(live);
    const result = await listFaqs();
    expect(result.fallback).toBeUndefined();
    expect(result.error).toBeUndefined();
    expect(result.items.map((i) => i.question)).toEqual(["A", "B", "A"]);
    // Returns category first (alpha), then Shipping. Within Returns: A
    // sortOrder 1 before B sortOrder 2.
    expect(result.items[0].category).toBe("Returns");
    expect(result.items[2].category).toBe("Shipping");
  });

  it("filters out malformed records (missing question or answer)", async () => {
    listCollectionItems.mockResolvedValueOnce([
      { question: "Real", answer: "Yes" },
      { question: "" }, // empty question
      { answer: "orphan" }, // no question
      "not an object",
    ]);
    const result = await listFaqs();
    expect(result.fallback).toBeUndefined();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].question).toBe("Real");
  });

  it("falls back to FALLBACK_FAQS when the live read returns empty", async () => {
    listCollectionItems.mockResolvedValueOnce([]);
    const result = await listFaqs();
    expect(result.fallback).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.items).toBe(FALLBACK_FAQS);
  });

  it("falls back to FALLBACK_FAQS with error='wix_sdk' when the live read throws", async () => {
    listCollectionItems.mockRejectedValueOnce(new Error("network"));
    const result = await listFaqs();
    expect(result.fallback).toBe(true);
    expect(result.error).toBe("wix_sdk");
    expect(result.items).toBe(FALLBACK_FAQS);
  });
});

describe("groupFaqsByCategory", () => {
  it("groups items by category preserving insertion order", () => {
    const groups = groupFaqsByCategory([
      { category: "A", question: "1", answer: "x" },
      { category: "B", question: "2", answer: "x" },
      { category: "A", question: "3", answer: "x" },
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].category).toBe("A");
    expect(groups[0].items.map((i) => i.question)).toEqual(["1", "3"]);
    expect(groups[1].category).toBe("B");
  });

  it("buckets items without a category under 'General'", () => {
    const groups = groupFaqsByCategory([
      { question: "1", answer: "x" },
      { category: "Shipping", question: "2", answer: "x" },
    ]);
    expect(groups.find((g) => g.category === "General")).toBeDefined();
  });
});
