// Unit tests for buildPageUrl — now a public export from PLPPagination since
// shop/[category]/page.tsx consumes it for the over-paginated back-to-page-1
// link (cf-3qt.6.B.1 / PR #46). plp-page.test.ts covers integration cases;
// these cover the helper's input-shape edges in isolation.

import { describe, it, expect } from "vitest";
import { buildPageUrl } from "@/components/plp/PLPPagination";

describe("buildPageUrl", () => {
  const base = "/shop/futon-frames";

  describe("page parameter handling", () => {
    it("targetPage=1 → omits page param entirely", () => {
      expect(buildPageUrl(base, {}, 1)).toBe(base);
    });

    it("targetPage=2 → adds page=2", () => {
      expect(buildPageUrl(base, {}, 2)).toBe(`${base}?page=2`);
    });

    it("targetPage=1 → strips existing page param (back-to-page-1 link)", () => {
      const url = buildPageUrl(base, { page: "5", sort: "price-asc" }, 1);
      expect(url).not.toMatch(/page=/);
      expect(url).toContain("sort=price-asc");
    });

    it("replaces existing page param with new one (no duplicates)", () => {
      const url = buildPageUrl(base, { page: "3" }, 4);
      expect((url.match(/page=/g) ?? []).length).toBe(1);
      expect(url).toContain("page=4");
    });
  });

  describe("invalid targetPage values", () => {
    // buildPageUrl uses `targetPage > 1` to decide whether to emit the param.
    // Non-finite / non-positive inputs fall to the "no page" branch, which is
    // the safest default — a malformed link should never generate ?page=NaN.
    it("targetPage=0 → omits page param", () => {
      expect(buildPageUrl(base, { sort: "newest" }, 0)).toBe(
        `${base}?sort=newest`,
      );
    });

    it("targetPage=-1 → omits page param", () => {
      expect(buildPageUrl(base, {}, -1)).toBe(base);
    });

    it("targetPage=NaN → omits page param (no ?page=NaN)", () => {
      const url = buildPageUrl(base, {}, Number.NaN);
      expect(url).toBe(base);
      expect(url).not.toMatch(/NaN/);
    });

    it("targetPage=Infinity → emits page=Infinity (caller contract: pass int)", () => {
      // Documents current behavior: Infinity > 1 is true, so the helper
      // serializes it. Callers are expected to pass a clamped integer; this
      // test pins the behavior so future input-sanitization changes are
      // intentional rather than accidental.
      const url = buildPageUrl(base, {}, Number.POSITIVE_INFINITY);
      expect(url).toContain("page=Infinity");
    });

    it("targetPage=2.7 → emits page=2.7 (caller contract: pass int)", () => {
      // Same as Infinity: pins current behavior. Page parsing on the read
      // side (parseSearchParams) does Math.max(1, parseInt(...)), which
      // normalizes any non-int arrival back to an integer.
      const url = buildPageUrl(base, {}, 2.7);
      expect(url).toContain("page=2.7");
    });
  });

  describe("searchParams shapes", () => {
    it("preserves unrelated string params (sort, priceMin, priceMax, inStock)", () => {
      const url = buildPageUrl(
        base,
        {
          sort: "price-asc",
          priceMin: "200",
          priceMax: "1000",
          inStock: "1",
        },
        2,
      );
      expect(url).toContain("sort=price-asc");
      expect(url).toContain("priceMin=200");
      expect(url).toContain("priceMax=1000");
      expect(url).toContain("inStock=1");
      expect(url).toContain("page=2");
    });

    it("picks first value for array-valued params (?foo=a&foo=b)", () => {
      const url = buildPageUrl(base, { sort: ["price-asc", "newest"] }, 1);
      expect(url).toContain("sort=price-asc");
      expect(url).not.toContain("newest");
    });

    it("skips array-valued param whose first element is undefined", () => {
      // sp[k] = [undefined, "x"] is a pathological shape URLSearchParams
      // itself won't produce, but the Record<string, string|string[]|undefined>
      // contract allows it. Confirms no ?sort=undefined leaks.
      const url = buildPageUrl(
        base,
        { sort: [undefined as unknown as string] },
        1,
      );
      expect(url).toBe(base);
      expect(url).not.toMatch(/sort=/);
    });

    it("skips undefined-valued params", () => {
      const url = buildPageUrl(base, { sort: undefined, priceMin: "100" }, 1);
      expect(url).toContain("priceMin=100");
      expect(url).not.toMatch(/sort=/);
    });
    // (empty searchParams + targetPage=1 → basePath is already covered by
    // the first two tests in "page parameter handling"; not duplicated here.)
  });

  describe("URL encoding", () => {
    it("URL-encodes special chars in param values", () => {
      const url = buildPageUrl(base, { sort: "price asc & filter" }, 1);
      // URLSearchParams.toString() encodes space as '+' and '&' as '%26'.
      expect(url).toContain("price+asc+%26+filter");
      expect(url).not.toContain("price asc & filter");
    });

    it("URL-encodes unicode in param values", () => {
      const url = buildPageUrl(base, { q: "café" }, 1);
      expect(url).toContain("q=caf%C3%A9");
    });
  });
});
