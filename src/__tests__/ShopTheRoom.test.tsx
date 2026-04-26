import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock getProductBySlug so the section can be rendered without hitting Wix.
const getProductBySlugMock = vi.fn();
vi.mock("@/lib/wix/products", async () => {
  const actual = await vi.importActual<typeof import("@/lib/wix/products")>(
    "@/lib/wix/products",
  );
  return { ...actual, getProductBySlug: (slug: string) => getProductBySlugMock(slug) };
});

import { ShopTheRoom, __TEST__ } from "@/components/site/ShopTheRoom";

// cf-delight Phase 2: home-page wiring of RoomHotspots. Behavioral coverage
// for the dot interaction is in RoomHotspots.test.tsx; here we pin the
// section's section-level contract — heading, hero photo, hotspot config
// invariants, and the live-data resolution path (drops missing slugs +
// formats prices from real product envelopes).

function product(name: string, price: number) {
  return {
    name,
    priceData: {
      price,
      formatted: { price: `$${price.toFixed(2)}` },
    },
  };
}

beforeEach(() => {
  getProductBySlugMock.mockReset();
  // Default happy path so render-level tests don't have to repeat fixtures
  getProductBySlugMock.mockImplementation(async (slug: string) => {
    const fixtures: Record<string, ReturnType<typeof product>> = {
      "ranchero-murphy-cabinet-bed": product("Ranchero Murphy Cabinet Bed", 2978),
      "canby-mattress": product("Canby Mattress", 737),
      "solstice-mattress": product("Solstice Mattress", 829),
    };
    return fixtures[slug] ?? null;
  });
});

describe("ShopTheRoom (config invariants)", () => {
  const { HOTSPOT_CONFIGS, HERO_PHOTO } = __TEST__;

  it("uses a Wix-hosted lifestyle photo with descriptive alt text", () => {
    expect(HERO_PHOTO.src).toMatch(/^https:\/\/static\.wixstatic\.com\//);
    expect(HERO_PHOTO.alt.length).toBeGreaterThan(20);
    expect(HERO_PHOTO.width).toBeGreaterThan(0);
    expect(HERO_PHOTO.height).toBeGreaterThan(0);
  });

  it("ships at least 3 hotspots so the 'shop the room' framing reads as intentional", () => {
    expect(HOTSPOT_CONFIGS.length).toBeGreaterThanOrEqual(3);
  });

  it("every hotspot has in-bounds coordinates and a non-empty product slug", () => {
    for (const cfg of HOTSPOT_CONFIGS) {
      expect(cfg.xPct).toBeGreaterThanOrEqual(0);
      expect(cfg.xPct).toBeLessThanOrEqual(100);
      expect(cfg.yPct).toBeGreaterThanOrEqual(0);
      expect(cfg.yPct).toBeLessThanOrEqual(100);
      // Product slugs are URL segments — keep them URL-safe so the
      // RoomHotspots /products/[slug] href stays clean.
      expect(cfg.productSlug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("uses unique hotspot ids (RoomHotspots warns and drops duplicates otherwise)", () => {
    const ids = HOTSPOT_CONFIGS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("does not duplicate the home-page first-hero photo URL", async () => {
    // Reading HERO_SLIDES via dynamic import keeps this test resilient if
    // the page module path moves. The point: visitors shouldn't see the
    // same Monterey scene above (in the carousel) and again here.
    const page = await import("@/app/page");
    const firstHero = page.HERO_SLIDES[0]?.src;
    expect(firstHero).toBeTruthy();
    expect(__TEST__.HERO_PHOTO.src).not.toBe(firstHero);
  });
});

describe("ShopTheRoom (live data resolution)", () => {
  it("resolves product name + price from getProductBySlug, never lying about catalog state", async () => {
    const hotspots = await __TEST__.resolveHotspots();
    expect(hotspots).toHaveLength(3);
    const ranchero = hotspots.find((h) => h.id === "ranchero")!;
    expect(ranchero.productName).toBe("Ranchero Murphy Cabinet Bed");
    expect(ranchero.formattedPrice).toBe("$2978.00");
  });

  it("drops a hotspot whose slug 404s in the catalog (no broken PDP link rendered)", async () => {
    getProductBySlugMock.mockImplementation(async (slug: string) =>
      slug === "canby-mattress" ? null : product("X", 100),
    );
    const hotspots = await __TEST__.resolveHotspots();
    expect(hotspots.find((h) => h.id === "canby")).toBeUndefined();
  });

  it("drops a hotspot whose product has no usable price (variant-priced products)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    getProductBySlugMock.mockImplementation(async (slug: string) =>
      slug === "canby-mattress"
        ? { name: "Canby", priceData: { price: 0 } } // variant-priced sentinel
        : product("X", 100),
    );
    const hotspots = await __TEST__.resolveHotspots();
    expect(hotspots.find((h) => h.id === "canby")).toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("falls back from formatted.price to numeric price when only the latter is present", async () => {
    getProductBySlugMock.mockImplementation(async () => ({
      name: "Numeric Only",
      priceData: { price: 12.5 },
    }));
    const hotspots = await __TEST__.resolveHotspots();
    expect(hotspots[0]?.formattedPrice).toBe("$12.50");
  });
});

describe("ShopTheRoom (render)", () => {
  it("renders the section heading + lede when at least one hotspot resolves", async () => {
    const ui = await ShopTheRoom();
    render(ui);
    expect(
      screen.getByRole("heading", { level: 2, name: /tap a piece you like/i }),
    ).toBeInTheDocument();
  });

  it("renders the lifestyle hero image with the configured alt", async () => {
    const ui = await ShopTheRoom();
    render(ui);
    const img = screen.getByRole("img", {
      name: /murphy cabinet bed open in a home office/i,
    });
    expect(img).toBeInTheDocument();
  });

  it("renders one dot per resolved hotspot, named after the live catalog product", async () => {
    const ui = await ShopTheRoom();
    render(ui);
    expect(
      screen.getByRole("button", { name: /shop ranchero murphy cabinet bed/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /shop canby mattress/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /shop solstice mattress/i }),
    ).toBeInTheDocument();
  });

  it("ties the section heading to the wrapping <section> via aria-labelledby", async () => {
    const ui = await ShopTheRoom();
    const { container } = render(ui);
    const section = container.querySelector("section");
    expect(section?.getAttribute("aria-labelledby")).toBe(
      "shop-the-room-heading",
    );
    expect(document.getElementById("shop-the-room-heading")).toBeInstanceOf(
      HTMLElement,
    );
  });

  it("renders nothing (returns null) if every product 404s", async () => {
    getProductBySlugMock.mockResolvedValue(null);
    const ui = await ShopTheRoom();
    expect(ui).toBeNull();
  });
});
