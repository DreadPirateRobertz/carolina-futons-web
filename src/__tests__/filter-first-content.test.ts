// cfw-15s — loadFilterFirstHeroCopy reads the three Brenda-editable hero
// strings from SiteContent and falls back per-key. Mirrors the
// site-content.test.ts harness (server-only + next/cache shims, Wix data
// reader mocked, vi.resetModules between cases to get a clean React.cache).

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
  revalidateTag: vi.fn(),
}));

const mockListCollectionItems = vi.fn();
vi.mock("@/lib/wix/data", () => ({
  listCollectionItems: (...args: unknown[]) => mockListCollectionItems(...args),
}));

async function freshLoadFilterFirstHeroCopy() {
  vi.resetModules();
  const mod = await import("@/lib/cms/filter-first-content");
  return mod.loadFilterFirstHeroCopy;
}

beforeEach(() => {
  mockListCollectionItems.mockReset();
});

describe("loadFilterFirstHeroCopy", () => {
  it("returns the shipped defaults when SiteContent has no rows", async () => {
    mockListCollectionItems.mockResolvedValue([]);
    const load = await freshLoadFilterFirstHeroCopy();

    const copy = await load();

    expect(copy.eyebrow).toBe("Family owned · Hendersonville, NC");
    expect(copy.headline).toBe("Find your perfect futon");
    expect(copy.subhead).toMatch(/Choose from our selection/);
  });

  it("returns the shipped defaults when Wix is down (read throws)", async () => {
    // listCollectionItems throws → site-content catches → empty map → fallbacks win.
    mockListCollectionItems.mockRejectedValue(new Error("wix unreachable"));
    const load = await freshLoadFilterFirstHeroCopy();

    const copy = await load();

    expect(copy.eyebrow).toBe("Family owned · Hendersonville, NC");
    expect(copy.headline).toBe("Find your perfect futon");
    expect(copy.subhead).toMatch(/Choose from our selection/);
  });

  it("returns Brenda's overrides when SiteContent rows are present", async () => {
    mockListCollectionItems.mockResolvedValue([
      { key: "home.filter-first.eyebrow", value: "Made in Carolina" },
      { key: "home.filter-first.headline", value: "Built for sleep" },
      { key: "home.filter-first.subhead", value: "Hardwood frames, honest pricing." },
    ]);
    const load = await freshLoadFilterFirstHeroCopy();

    const copy = await load();

    expect(copy.eyebrow).toBe("Made in Carolina");
    expect(copy.headline).toBe("Built for sleep");
    expect(copy.subhead).toBe("Hardwood frames, honest pricing.");
  });

  it("falls back per-key when only some rows are present", async () => {
    // Only the headline is set in the CMS — eyebrow + subhead must fall back.
    mockListCollectionItems.mockResolvedValue([
      { key: "home.filter-first.headline", value: "Built for sleep" },
    ]);
    const load = await freshLoadFilterFirstHeroCopy();

    const copy = await load();

    expect(copy.eyebrow).toBe("Family owned · Hendersonville, NC");
    expect(copy.headline).toBe("Built for sleep");
    expect(copy.subhead).toMatch(/Choose from our selection/);
  });

  it("treats an empty-string CMS row as 'not set' and falls back", async () => {
    // cf-b3mf parity — getSiteContent uses || not ?? so empty strings yield the
    // caller's fallback. Without this, Brenda blanking a row would ship empty
    // hero copy to production. Mirrors cfw-61b's announcement.rotation fix.
    mockListCollectionItems.mockResolvedValue([
      { key: "home.filter-first.headline", value: "" },
    ]);
    const load = await freshLoadFilterFirstHeroCopy();

    const copy = await load();

    expect(copy.headline).toBe("Find your perfect futon");
  });
});
