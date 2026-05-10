// cfw-h74: coverage for src/lib/discovery/guides.ts — GUIDES manifest
// + getGuideBySlug + getRelatedGuides + listGuides. Risks pinned:
// duplicate slug breaks getGuideBySlug, getRelatedGuides forgets to
// exclude the current slug (related-includes-self), listGuides loses
// its GUIDES fallback during a Wix outage and /guides goes empty.

import { describe, it, expect, beforeEach, vi } from "vitest";

const listCollectionItems = vi.fn();
const logWixFailure = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/wix/data", () => ({
  listCollectionItems: (...args: unknown[]) => listCollectionItems(...args),
}));
vi.mock("@/lib/wix/errors", () => ({
  logWixFailure: (...args: unknown[]) => logWixFailure(...args),
}));

import {
  GUIDES,
  getGuideBySlug,
  getRelatedGuides,
  listGuides,
} from "@/lib/discovery/guides";

beforeEach(() => {
  listCollectionItems.mockReset();
  logWixFailure.mockClear();
});

describe("GUIDES static manifest", () => {
  it("is non-empty (seed/fallback for /guides during dev + Wix outage)", () => {
    expect(GUIDES.length).toBeGreaterThan(0);
  });

  it("all slugs are unique", () => {
    const slugs = GUIDES.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it.each(GUIDES)("slug is kebab-case lowercase — $slug", (g) => {
    expect(g.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it.each(GUIDES)(
    "$slug — title and hook are non-empty trimmed strings",
    (g) => {
      expect(g.title.trim().length).toBeGreaterThan(0);
      expect(g.hook.trim().length).toBeGreaterThan(0);
    },
  );

  it.each(GUIDES)("$slug — readingTimeMin is a positive integer", (g) => {
    expect(Number.isInteger(g.readingTimeMin)).toBe(true);
    expect(g.readingTimeMin).toBeGreaterThan(0);
  });

  it.each(GUIDES)(
    "$slug — coverImageUrl is HTTPS or null (no http:, no relative)",
    (g) => {
      if (g.coverImageUrl !== null) {
        expect(g.coverImageUrl).toMatch(/^https:\/\//);
      }
    },
  );

  it("includes the documented seed slug 'how-to-pick-a-futon-mattress' (regression guard)", () => {
    const slugs = GUIDES.map((g) => g.slug);
    expect(slugs).toContain("how-to-pick-a-futon-mattress");
  });
});

describe("getGuideBySlug", () => {
  it("returns the matching guide for a known slug", () => {
    const known = GUIDES[0]!.slug;
    const out = getGuideBySlug(known);
    expect(out).toBeDefined();
    expect(out?.slug).toBe(known);
  });

  it("returns undefined for an unknown slug", () => {
    expect(getGuideBySlug("not-a-real-slug")).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(getGuideBySlug("")).toBeUndefined();
  });

  it("is case-sensitive (uppercase doesn't match)", () => {
    const known = GUIDES[0]!.slug;
    expect(getGuideBySlug(known.toUpperCase())).toBeUndefined();
  });
});

describe("getRelatedGuides", () => {
  it("excludes the current slug from results", () => {
    const cur = GUIDES[0]!.slug;
    const out = getRelatedGuides(cur);
    expect(out.map((g) => g.slug)).not.toContain(cur);
  });

  it("returns 3 items by default", () => {
    expect(getRelatedGuides(GUIDES[0]!.slug)).toHaveLength(
      Math.min(3, GUIDES.length - 1),
    );
  });

  it("respects a custom count argument", () => {
    expect(getRelatedGuides(GUIDES[0]!.slug, 1)).toHaveLength(1);
    expect(getRelatedGuides(GUIDES[0]!.slug, 2)).toHaveLength(2);
  });

  it("count larger than the manifest returns ALL-except-self", () => {
    const out = getRelatedGuides(GUIDES[0]!.slug, 9999);
    expect(out).toHaveLength(GUIDES.length - 1);
    expect(out.map((g) => g.slug)).not.toContain(GUIDES[0]!.slug);
  });

  it("unknown current slug returns N items (no slug to exclude)", () => {
    const out = getRelatedGuides("not-a-real-slug", 2);
    expect(out).toHaveLength(2);
  });

  it("count of 0 returns empty array", () => {
    expect(getRelatedGuides(GUIDES[0]!.slug, 0)).toEqual([]);
  });
});

describe("listGuides — Wix-backed reader", () => {
  it("maps Wix rows to GuideSummary when the collection is populated", async () => {
    listCollectionItems.mockResolvedValueOnce([
      {
        _id: "row-1",
        slug: "wix-only-guide",
        title: "Wix Only Guide",
        hook: "Hook from Wix",
        readingTimeMin: 7,
        coverImage: "https://static.wixstatic.com/media/foo.jpg",
      },
    ]);

    const out = await listGuides();
    expect(out).toHaveLength(1);
    expect(out[0]?.slug).toBe("wix-only-guide");
    expect(out[0]?.readingTimeMin).toBe(7);
  });

  it("falls back to GUIDES when Wix returns an empty array (CMS not yet provisioned)", async () => {
    listCollectionItems.mockResolvedValueOnce([]);

    const out = await listGuides();
    expect(out).toEqual(GUIDES);
  });

  it("falls back to GUIDES when Wix throws AND logs the failure", async () => {
    listCollectionItems.mockRejectedValueOnce(new Error("wix down"));

    const out = await listGuides();
    expect(out).toEqual(GUIDES);
    expect(logWixFailure).toHaveBeenCalledWith(
      "wix-data",
      "listGuides",
      expect.any(Error),
    );
  });

  it("drops Wix rows that fail toGuideSummary (missing slug/title/hook)", async () => {
    listCollectionItems.mockResolvedValueOnce([
      // valid row
      {
        slug: "valid-guide",
        title: "Valid",
        hook: "Hook",
        readingTimeMin: 4,
      },
      // missing title — dropped
      { slug: "no-title", hook: "x" },
      // missing hook — dropped
      { slug: "no-hook", title: "x" },
      // missing slug — dropped
      { title: "x", hook: "x" },
      // empty/whitespace fields — dropped
      { slug: "  ", title: "  ", hook: "  " },
    ]);

    const out = await listGuides();
    expect(out).toHaveLength(1);
    expect(out[0]?.slug).toBe("valid-guide");
  });

  it("defaults readingTimeMin to 5 when Wix row omits it", async () => {
    listCollectionItems.mockResolvedValueOnce([
      { slug: "no-time", title: "No Time", hook: "h" },
    ]);

    const out = await listGuides();
    expect(out[0]?.readingTimeMin).toBe(5);
  });

  it("trims whitespace from slug/title/hook on the Wix row mapping", async () => {
    listCollectionItems.mockResolvedValueOnce([
      { slug: "  trimmed  ", title: "  Title  ", hook: "  Hook  " },
    ]);

    const out = await listGuides();
    expect(out[0]).toMatchObject({
      slug: "trimmed",
      title: "Title",
      hook: "Hook",
    });
  });

  it("coverImage as object {url} resolves to that URL", async () => {
    listCollectionItems.mockResolvedValueOnce([
      {
        slug: "obj-cover",
        title: "T",
        hook: "h",
        coverImage: { url: "https://example.com/cover.jpg" },
      },
    ]);

    const out = await listGuides();
    expect(out[0]?.coverImageUrl).toBe("https://example.com/cover.jpg");
  });

  it("missing coverImage falls back to COVER_IMAGES[slug] (when slug is keyed) or null", async () => {
    listCollectionItems.mockResolvedValueOnce([
      // unkeyed slug — null
      { slug: "fully-unknown-slug", title: "T", hook: "h" },
    ]);

    const out = await listGuides();
    expect(out[0]?.coverImageUrl).toBeNull();
  });
});
