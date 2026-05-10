// cf-4mol (cfw-66o.2) — SiteContent reader covers the four cases callers
// rely on: present key, missing key, outage, and within-render dedupe.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

// cfw-vxb: site-content now wraps the Wix fetch in next/cache.unstable_cache.
// Its production behaviour requires a Next request/work-store context that
// vitest doesn't provide, so mock it as an identity wrapper for tests.
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
  revalidateTag: vi.fn(),
}));

const mockListCollectionItems = vi.fn();
vi.mock("@/lib/wix/data", () => ({
  listCollectionItems: (...args: unknown[]) => mockListCollectionItems(...args),
}));

// React.cache memoizes per render — in tests we want fresh state per case.
// Re-importing the module after vi.resetModules() gives us a clean cache.
async function freshGetSiteContent() {
  vi.resetModules();
  const mod = await import("@/lib/cms/site-content");
  return mod.getSiteContent;
}

beforeEach(() => {
  mockListCollectionItems.mockReset();
});

describe("getSiteContent", () => {
  it("queries the SiteContent collection", async () => {
    mockListCollectionItems.mockResolvedValue([]);
    const getSiteContent = await freshGetSiteContent();

    await getSiteContent("anything");

    expect(mockListCollectionItems).toHaveBeenCalledWith("SiteContent", 500);
  });

  it("returns the row value when the key is present", async () => {
    mockListCollectionItems.mockResolvedValue([
      { key: "footer.tagline", value: "Hardwood futons since 1991" },
      { key: "hero.headline", value: "Built to last" },
    ]);
    const getSiteContent = await freshGetSiteContent();

    const value = await getSiteContent("footer.tagline", "DEFAULT");

    expect(value).toBe("Hardwood futons since 1991");
  });

  it("returns the fallback when the key is missing", async () => {
    mockListCollectionItems.mockResolvedValue([
      { key: "hero.headline", value: "Built to last" },
    ]);
    const getSiteContent = await freshGetSiteContent();

    const value = await getSiteContent("footer.tagline", "fallback copy");

    expect(value).toBe("fallback copy");
  });

  it("returns the fallback when the SiteContent collection is empty", async () => {
    mockListCollectionItems.mockResolvedValue([]);
    const getSiteContent = await freshGetSiteContent();

    const value = await getSiteContent("hero.headline", "Carolina Futons");

    expect(value).toBe("Carolina Futons");
  });

  it("returns the fallback when Wix throws (outage)", async () => {
    mockListCollectionItems.mockRejectedValue(
      Object.assign(new Error("wix down"), { code: "WIX_OUTAGE" }),
    );
    const getSiteContent = await freshGetSiteContent();

    const value = await getSiteContent("hero.headline", "Built to last");

    expect(value).toBe("Built to last");
  });

  it("does not throw to the caller on unexpected errors", async () => {
    mockListCollectionItems.mockRejectedValue("not even an Error");
    const getSiteContent = await freshGetSiteContent();

    await expect(getSiteContent("hero.headline", "ok")).resolves.toBe("ok");
  });

  it("defaults the fallback to empty string when none is provided", async () => {
    mockListCollectionItems.mockResolvedValue([]);
    const getSiteContent = await freshGetSiteContent();

    const value = await getSiteContent("missing.key");

    expect(value).toBe("");
  });

  it("resolves multiple lookups against a single Wix snapshot", async () => {
    // React.cache only dedupes inside a Server Component render; here we
    // assert the data contract — every call sees the same snapshot — rather
    // than the call count, which is render-context-dependent.
    mockListCollectionItems.mockResolvedValue([
      { key: "a", value: "alpha" },
      { key: "b", value: "beta" },
    ]);
    const getSiteContent = await freshGetSiteContent();

    const [a, b, missing] = await Promise.all([
      getSiteContent("a", ""),
      getSiteContent("b", ""),
      getSiteContent("nope", "fb"),
    ]);

    expect(a).toBe("alpha");
    expect(b).toBe("beta");
    expect(missing).toBe("fb");
  });

  it("returns the fallback when the row value is an empty string (cf-b3mf)", async () => {
    // Brenda's blank CMS entries on production were overwriting the
    // hardcoded announcement.rotation messages because `??` only catches
    // null/undefined — empty strings flowed through. Switching to `||` so
    // empty = "not set" = fallback wins. Regression pin so a future drive-by
    // back to `??` fails CI loudly.
    mockListCollectionItems.mockResolvedValue([
      { key: "announcement.rotation.0.message", value: "" },
      { key: "footer.tagline", value: "" },
    ]);
    const getSiteContent = await freshGetSiteContent();

    expect(
      await getSiteContent(
        "announcement.rotation.0.message",
        "Free shipping over $99",
      ),
    ).toBe("Free shipping over $99");
    expect(await getSiteContent("footer.tagline", "Quality futons")).toBe(
      "Quality futons",
    );
  });

  it("returns '' when both value AND fallback are empty (cf-b3mf invariant)", async () => {
    // The `||` rewrite must NOT change behavior when the caller intentionally
    // wants an empty result — `'' || ''` is still `''`, which is the same
    // observable outcome as the previous `'' ?? ''`.
    mockListCollectionItems.mockResolvedValue([
      { key: "optional.key", value: "" },
    ]);
    const getSiteContent = await freshGetSiteContent();

    expect(await getSiteContent("optional.key", "")).toBe("");
    expect(await getSiteContent("optional.key")).toBe("");
  });

  it("ignores rows where value is not a string (defensive)", async () => {
    mockListCollectionItems.mockResolvedValue([
      { key: "good", value: "ok" },
      { key: "draft-js", value: { blocks: [] } }, // Wix RICH_TEXT shape
      { key: "null-value", value: null },
      { key: "no-value" },
    ]);
    const getSiteContent = await freshGetSiteContent();

    expect(await getSiteContent("good", "fb")).toBe("ok");
    expect(await getSiteContent("draft-js", "fb")).toBe("fb");
    expect(await getSiteContent("null-value", "fb")).toBe("fb");
    expect(await getSiteContent("no-value", "fb")).toBe("fb");
  });

  it("ignores rows without a string key (defensive)", async () => {
    mockListCollectionItems.mockResolvedValue([
      { key: 42, value: "numeric-key-skipped" },
      { key: "real.key", value: "kept" },
    ]);
    const getSiteContent = await freshGetSiteContent();

    expect(await getSiteContent("real.key", "fb")).toBe("kept");
  });
});
