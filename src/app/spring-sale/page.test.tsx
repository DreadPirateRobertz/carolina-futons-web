import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

// cf-yu2l.F1: /spring-sale reads hero copy + CTAs from the `Landings` Wix-Data
// collection (slug="spring-sale") so marketing can edit the promo without a
// deploy. Wiring lands ahead of blaidd's collection seed — the fallback path
// is byte-identical to the pre-cf-yu2l.F1 hardcoded render, so the seed-not-yet
// state is safe.

// Mock the data layer at the cf3qt helper boundary. We do NOT mock the wix
// SDK directly — the helper is the contract we depend on.
const { getLandingBySlug } = vi.hoisted(() => ({
  getLandingBySlug: vi.fn(),
}));
vi.mock("@/lib/wix/cf3qt", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/wix/cf3qt")>();
  return { ...actual, getLandingBySlug };
});

// Stub the derived-products resolver so the test stays page-shape-focused.
vi.mock("@/lib/shop/derived-products", () => ({
  resolveDerivedProducts: vi.fn().mockResolvedValue({ items: [], error: null }),
}));

import SpringSalePage, { generateMetadata } from "./page";

afterEach(() => {
  cleanup();
  getLandingBySlug.mockReset();
});

async function renderSpringSale() {
  const ui = await SpringSalePage();
  return render(ui);
}

describe("SpringSalePage — fallback when Landings collection is empty (blaidd seed not yet)", () => {
  it("renders hardcoded headline when getLandingBySlug returns null", async () => {
    getLandingBySlug.mockResolvedValue(null);
    await renderSpringSale();
    expect(
      screen.getByRole("heading", { level: 1, name: /Spring Sale on mattresses/i }),
    ).toBeInTheDocument();
  });

  it("renders hardcoded subheading body copy when Landing is null", async () => {
    getLandingBySlug.mockResolvedValue(null);
    await renderSpringSale();
    expect(
      screen.getByText(/Hendersonville, NC\. American-made mattresses/i),
    ).toBeInTheDocument();
  });

  it("renders the hardcoded CTAs when Landing is null", async () => {
    getLandingBySlug.mockResolvedValue(null);
    await renderSpringSale();
    expect(
      screen.getByRole("link", { name: /Shop the sale/i }).getAttribute("href"),
    ).toBe("/shop/mattresses-sale");
    expect(
      screen.getByRole("link", { name: /Browse all mattresses/i }).getAttribute("href"),
    ).toBe("/shop/mattresses");
  });

  it("calls getLandingBySlug with the canonical spring-sale slug", async () => {
    getLandingBySlug.mockResolvedValue(null);
    await renderSpringSale();
    expect(getLandingBySlug).toHaveBeenCalledWith("spring-sale");
  });
});

describe("SpringSalePage — uses Landing fields when present", () => {
  it("renders Landing.headline as h1 when provided", async () => {
    getLandingBySlug.mockResolvedValue({
      _id: "x",
      slug: "spring-sale",
      title: "x",
      headline: "Editor-driven spring promotion",
    });
    await renderSpringSale();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Editor-driven spring promotion/i,
      }),
    ).toBeInTheDocument();
  });

  it("renders Landing.subheadline body copy when provided", async () => {
    getLandingBySlug.mockResolvedValue({
      _id: "x",
      slug: "spring-sale",
      title: "x",
      headline: "x",
      subheadline: "Marketing-controlled subheadline goes here for testing.",
    });
    await renderSpringSale();
    expect(
      screen.getByText(
        /Marketing-controlled subheadline goes here for testing/i,
      ),
    ).toBeInTheDocument();
  });

  it("renders Landing.ctaPrimary{Label,Href} when provided", async () => {
    getLandingBySlug.mockResolvedValue({
      _id: "x",
      slug: "spring-sale",
      title: "x",
      headline: "x",
      ctaPrimaryLabel: "Shop seasonal picks",
      ctaPrimaryHref: "/shop/mattresses-spring",
    });
    await renderSpringSale();
    const cta = screen.getByRole("link", { name: /Shop seasonal picks/i });
    expect(cta.getAttribute("href")).toBe("/shop/mattresses-spring");
  });

  it("renders Landing.ctaSecondary{Label,Href} when provided", async () => {
    getLandingBySlug.mockResolvedValue({
      _id: "x",
      slug: "spring-sale",
      title: "x",
      headline: "x",
      ctaSecondaryLabel: "Compare all mattresses",
      ctaSecondaryHref: "/compare/popular-mattresses",
    });
    await renderSpringSale();
    const cta = screen.getByRole("link", {
      name: /Compare all mattresses/i,
    });
    expect(cta.getAttribute("href")).toBe("/compare/popular-mattresses");
  });
});

describe("SpringSalePage — field-level fallback", () => {
  it("uses Landing.headline but falls back to hardcoded CTAs when Landing.cta* missing", async () => {
    // Partial Landing: editor set the headline but never filled CTAs.
    // The page must use Landing.headline AND fall back to hardcoded CTAs
    // per-field — not all-or-nothing.
    getLandingBySlug.mockResolvedValue({
      _id: "x",
      slug: "spring-sale",
      title: "x",
      headline: "Custom headline from CMS",
      // ctaPrimary{Label,Href} intentionally omitted
    });
    await renderSpringSale();
    expect(
      screen.getByRole("heading", { level: 1, name: /Custom headline from CMS/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Shop the sale/i }).getAttribute("href"),
    ).toBe("/shop/mattresses-sale");
  });

  it("renders the page without crashing when getLandingBySlug throws", async () => {
    // Wix outage / data-layer failure must not 500 the page — the resilient
    // fallback path keeps the promo visible with hardcoded copy.
    getLandingBySlug.mockRejectedValue(new Error("Wix unreachable"));
    await renderSpringSale();
    expect(
      screen.getByRole("heading", { level: 1, name: /Spring Sale on mattresses/i }),
    ).toBeInTheDocument();
  });
});

describe("SpringSalePage — generateMetadata (cf-yu2l.F1.2 SEO field wiring)", () => {
  // generateMetadata also reads the Landings collection so the page <title>,
  // description, and social-card og:image follow the editor without redeploy.
  // Mirrors the body-copy wiring contract: per-field fallback, .catch on
  // the data-layer call so a Wix outage produces the default metadata
  // rather than throwing during Next.js's metadata resolution phase.

  it("returns the default description when getLandingBySlug returns null", async () => {
    getLandingBySlug.mockResolvedValue(null);
    const meta = await generateMetadata();
    expect(meta.description).toMatch(/Mattress promotions running this season/i);
  });

  it("uses Landing.seoDescription when provided", async () => {
    getLandingBySlug.mockResolvedValue({
      _id: "x",
      slug: "spring-sale",
      title: "x",
      headline: "x",
      seoDescription: "Editor-controlled SEO description for the spring promo.",
    });
    const meta = await generateMetadata();
    expect(meta.description).toBe(
      "Editor-controlled SEO description for the spring promo.",
    );
  });

  it("uses Landing.ogImageUrl in openGraph.images when provided", async () => {
    getLandingBySlug.mockResolvedValue({
      _id: "x",
      slug: "spring-sale",
      title: "x",
      headline: "x",
      ogImageUrl: "https://static.wixstatic.com/spring-sale-social-card.jpg",
    });
    const meta = await generateMetadata();
    const og = meta.openGraph as { images: { url: string }[] };
    expect(og.images?.[0]?.url).toBe(
      "https://static.wixstatic.com/spring-sale-social-card.jpg",
    );
  });

  it("falls back to default openGraph image when Landing.ogImageUrl is missing", async () => {
    getLandingBySlug.mockResolvedValue({
      _id: "x",
      slug: "spring-sale",
      title: "x",
      headline: "x",
      // ogImageUrl omitted
    });
    const meta = await generateMetadata();
    const og = meta.openGraph as { images: { url: string }[] };
    expect(og.images?.[0]?.url).toBeTruthy();
  });

  it("returns default metadata when getLandingBySlug throws (Wix outage)", async () => {
    getLandingBySlug.mockRejectedValue(new Error("Wix unreachable"));
    const meta = await generateMetadata();
    expect(meta.description).toMatch(/Mattress promotions running this season/i);
    expect(meta.title).toMatch(/Spring Sale/);
  });

  it("preserves the spring-sale canonical regardless of Landing data", async () => {
    // canonical is a structural URL contract, never editor-managed —
    // pin it as immune to Landing field drift.
    getLandingBySlug.mockResolvedValue({
      _id: "x",
      slug: "spring-sale",
      title: "x",
      headline: "x",
      seoDescription: "custom",
    });
    const meta = await generateMetadata();
    expect(meta.alternates?.canonical).toBe("/spring-sale");
  });
});

describe("SpringSalePage — cf-yu2l.F1 v2 self-CR fold", () => {
  // The first wave shipped with `landing?.X ?? FALLBACK.X`. Plain `??`
  // does NOT coalesce empty strings — only null/undefined. Wix's
  // CMS editor saves cleared fields as "" not null, so a marketer who
  // deletes the headline ships an empty h1. v2 fixes via a coalesce
  // helper that rejects empty/whitespace-only strings.

  it("falls back to hardcoded headline when Landing.headline is empty string", async () => {
    getLandingBySlug.mockResolvedValue({
      _id: "x",
      slug: "spring-sale",
      title: "x",
      headline: "",
    });
    await renderSpringSale();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Spring Sale on mattresses/i,
      }),
    ).toBeInTheDocument();
  });

  it("falls back to hardcoded subheading when Landing.subheadline is whitespace-only", async () => {
    getLandingBySlug.mockResolvedValue({
      _id: "x",
      slug: "spring-sale",
      title: "x",
      headline: "x",
      subheadline: "   ",
    });
    await renderSpringSale();
    expect(
      screen.getByText(/Hendersonville, NC\. American-made mattresses/i),
    ).toBeInTheDocument();
  });

  it("falls back to hardcoded CTA href when Landing.ctaPrimaryHref is empty string", async () => {
    // Most load-bearing case: empty href would produce <a href=""> →
    // bookmarks the current page on click → broken UX.
    getLandingBySlug.mockResolvedValue({
      _id: "x",
      slug: "spring-sale",
      title: "x",
      headline: "x",
      ctaPrimaryLabel: "Shop seasonal picks",
      ctaPrimaryHref: "",
    });
    await renderSpringSale();
    const cta = screen.getByRole("link", { name: /Shop seasonal picks/i });
    expect(cta.getAttribute("href")).toBe("/shop/mattresses-sale");
  });

  it("falls back to default meta.description when Landing.seoDescription is empty", async () => {
    getLandingBySlug.mockResolvedValue({
      _id: "x",
      slug: "spring-sale",
      title: "x",
      headline: "x",
      seoDescription: "",
    });
    const meta = await generateMetadata();
    expect(meta.description).toMatch(/Mattress promotions running this season/i);
  });

  it("Landing-driven og:image carries 1200x630 social-card dimensions", async () => {
    // Crawlers pre-size cards using width/height — DEFAULT_OG_IMAGE
    // already carries them; the Landing-driven path must match so
    // social previews render consistently across the two codepaths.
    getLandingBySlug.mockResolvedValue({
      _id: "x",
      slug: "spring-sale",
      title: "x",
      headline: "x",
      ogImageUrl: "https://static.wixstatic.com/social-card.jpg",
    });
    const meta = await generateMetadata();
    const og = meta.openGraph as { images: { url: string; width?: number; height?: number }[] };
    expect(og.images?.[0]?.width).toBe(1200);
    expect(og.images?.[0]?.height).toBe(630);
  });

  it("trims surrounding whitespace from Landing.headline (editor copy-paste hygiene)", async () => {
    getLandingBySlug.mockResolvedValue({
      _id: "x",
      slug: "spring-sale",
      title: "x",
      headline: "  Editor headline with stray whitespace  ",
    });
    await renderSpringSale();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Editor headline with stray whitespace",
      }),
    ).toBeInTheDocument();
  });
});
