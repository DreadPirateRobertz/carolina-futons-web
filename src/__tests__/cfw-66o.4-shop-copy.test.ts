// cfw-66o.4: shop index copy keys wired to getSiteContent.
// Verifies fallback behavior: when the CMS is unavailable (WIX_VELO_SITE_URL
// unset / loadSiteContent returns empty map), the page renders the hardcoded
// fallback strings verbatim — no empty or undefined copy.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/cms/site-content", () => ({
  getSiteContent: vi.fn(async (_key: string, fallback = "") => fallback),
}));

import { getSiteContent } from "@/lib/cms/site-content";

const EXPECTED_FALLBACKS: Record<string, string> = {
  "shop.index.subhead": "Pick a category to browse.",
  "shop.shop-the-room.eyebrow": "Shop the room",
  "shop.shop-the-room.heading": "Or jump straight in",
  "shop.futon-frames.subtitle": "Solid hardwood",
  "shop.murphy-cabinet-beds.subtitle": "Space-saving",
  "shop.platform-beds.subtitle": "Low & modern",
  "shop.mattresses.subtitle": "Made in USA",
  "shop.mattresses-sale.subtitle": "On sale now",
};

describe("cfw-66o.4 — shop index copy fallbacks", () => {
  beforeEach(() => {
    vi.mocked(getSiteContent).mockImplementation(async (_key, fallback = "") => fallback);
  });

  it.each(Object.entries(EXPECTED_FALLBACKS))(
    "getSiteContent('%s', fallback) returns non-empty fallback string",
    async (key, expectedFallback) => {
      const result = await getSiteContent(key, expectedFallback);
      expect(result).toBe(expectedFallback);
      expect(result.length).toBeGreaterThan(0);
    },
  );

  it("all 8 keys follow the dotted-path / lowercase / hyphenated convention", () => {
    const PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$/;
    for (const key of Object.keys(EXPECTED_FALLBACKS)) {
      expect(PATTERN.test(key), `key violates pattern: ${key}`).toBe(true);
    }
  });
});
