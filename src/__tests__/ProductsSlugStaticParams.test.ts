/**
 * cf-c736 (cf-0oj5.fu5): PDP /products/[slug] generateStaticParams +
 * dynamicParams=false contract.
 *
 * Now that cf-0klm removed the layout cookies() call, the route tree is
 * ISR-eligible. This PR pre-renders the 88 catalog slugs at build time
 * via generateStaticParams() and uses dynamicParams=false to 404 unknown
 * slugs instead of attempting a runtime SSR fallback.
 *
 * Result: known slugs serve from build-time cache (instant 200), unknown
 * slugs return 404 without a Wix SDK roundtrip. Combined with the
 * cf-0oj5 revalidate=3600 ISR window, the catalog hits its perf budget
 * without per-request server cost.
 *
 * Strategy: source-grep + import-level assertions. The route exports
 * generateStaticParams + dynamicParams; we mock listAllProducts to
 * verify the slug-mapping shape without pulling in the Wix SDK chain.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const wixMocks = vi.hoisted(() => ({
  listAllProducts: vi.fn(),
  getProductBySlug: vi.fn(),
  isProductOnSale: vi.fn(() => false),
}));

vi.mock("@/lib/wix/products", () => wixMocks);

// Adjacent modules the page imports — stub to keep the test focused on
// the static-params contract.
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  flush: vi.fn(async () => true),
}));

beforeEach(() => {
  wixMocks.listAllProducts.mockReset();
  wixMocks.getProductBySlug.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("cf-c736 — /products/[slug] generateStaticParams contract", () => {
  it("exports generateStaticParams as an async function", async () => {
    wixMocks.listAllProducts.mockResolvedValue([]);
    const mod = await import("@/app/products/[slug]/page");
    expect(typeof mod.generateStaticParams).toBe("function");
    const result = mod.generateStaticParams();
    expect(typeof (result as { then?: unknown }).then).toBe("function");
  });

  it("exports dynamicParams=false (404 on unknown slugs, no runtime SSR)", async () => {
    wixMocks.listAllProducts.mockResolvedValue([]);
    const mod = await import("@/app/products/[slug]/page");
    expect(mod.dynamicParams).toBe(false);
  });

  it("maps every product to a { slug } param", async () => {
    wixMocks.listAllProducts.mockResolvedValue([
      { slug: "kingston-futon-frame" },
      { slug: "mesa-foam-mattress" },
      { slug: "monterey-platform-bed" },
    ]);
    const mod = await import("@/app/products/[slug]/page");
    const params = await mod.generateStaticParams();
    expect(params).toEqual([
      { slug: "kingston-futon-frame" },
      { slug: "mesa-foam-mattress" },
      { slug: "monterey-platform-bed" },
    ]);
  });

  it("filters out products with empty or missing slug (defensive)", async () => {
    // Wix occasionally returns rows with missing slugs (e.g. drafts).
    // generateStaticParams MUST drop them — Next.js would error on a
    // param with slug: undefined.
    wixMocks.listAllProducts.mockResolvedValue([
      { slug: "kingston-futon-frame" },
      { slug: "" },
      { slug: undefined as unknown as string },
      { slug: "mesa-foam-mattress" },
      { /* no slug field */ },
    ]);
    const mod = await import("@/app/products/[slug]/page");
    const params = await mod.generateStaticParams();
    expect(params).toEqual([
      { slug: "kingston-futon-frame" },
      { slug: "mesa-foam-mattress" },
    ]);
  });

  it("returns empty array when listAllProducts returns [] (Wix outage)", async () => {
    // listAllProducts already swallows Wix failures and returns [];
    // generateStaticParams must tolerate that — empty array is a valid
    // build-time result. Vercel build still succeeds; PDPs return 404
    // (dynamicParams=false) until the catalog is reachable on the next
    // build.
    wixMocks.listAllProducts.mockResolvedValue([]);
    const mod = await import("@/app/products/[slug]/page");
    const params = await mod.generateStaticParams();
    expect(params).toEqual([]);
  });

  it("calls listAllProducts once per build (no per-slug re-fetch)", async () => {
    wixMocks.listAllProducts.mockResolvedValue([
      { slug: "a" },
      { slug: "b" },
    ]);
    const mod = await import("@/app/products/[slug]/page");
    await mod.generateStaticParams();
    expect(wixMocks.listAllProducts).toHaveBeenCalledOnce();
  });
});
