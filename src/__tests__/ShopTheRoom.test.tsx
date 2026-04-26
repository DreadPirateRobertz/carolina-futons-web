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

import {
  ShopTheRoom,
  __TEST__,
  HOME_HERO_PHOTO,
  HOME_HOTSPOT_CONFIGS,
  ABOUT_HERO_PHOTO,
  ABOUT_HOTSPOT_CONFIGS,
  SHOP_HERO_PHOTO,
  SHOP_HOTSPOT_CONFIGS,
  FUTON_FRAMES_PLP_HERO_PHOTO,
  FUTON_FRAMES_PLP_HOTSPOT_CONFIGS,
  type HotspotConfig,
} from "@/components/site/ShopTheRoom";

// cf-delight Phase 2/3: behavioral coverage for the dot interaction is in
// RoomHotspots.test.tsx; here we pin (a) section-level contract — heading,
// hero photo, hotspot config invariants — and (b) live-data resolution
// (drops missing slugs + formats prices). Per-surface configs are
// validated via a shared invariant suite so adding a 4th surface only
// needs one row in the table.

// Mirror Wix's actual price formatting (thousands separator) so the test
// fixture matches what production callers see, not a stripped-down shape.
const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
function product(name: string, price: number) {
  return {
    name,
    priceData: {
      price,
      formatted: { price: usd.format(price) },
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
      "ekko-futon-frame": product("Ekko Futon Frame", 599),
      "solstice-mattress": product("Solstice Mattress", 829),
      "charleston-platform-bed": product("Charleston Platform Bed", 1099),
      "nutmeg-platform-bed": product("Nutmeg Platform Bed", 949),
      "portofino-mattress": product("Portofino Mattress", 859),
      "monterey-futon-frame": product("Monterey Futon Frame", 899),
      "kingston-futon-frame": product("Kingston Futon Frame", 619),
    };
    return fixtures[slug] ?? null;
  });
});

const SURFACES = [
  { name: "home", photo: HOME_HERO_PHOTO, configs: HOME_HOTSPOT_CONFIGS },
  { name: "about", photo: ABOUT_HERO_PHOTO, configs: ABOUT_HOTSPOT_CONFIGS },
  { name: "shop", photo: SHOP_HERO_PHOTO, configs: SHOP_HOTSPOT_CONFIGS },
  {
    name: "plp-futon-frames",
    photo: FUTON_FRAMES_PLP_HERO_PHOTO,
    configs: FUTON_FRAMES_PLP_HOTSPOT_CONFIGS,
  },
] as const;

describe.each(SURFACES)(
  "ShopTheRoom config invariants — $name surface",
  ({ photo, configs }) => {
    it("uses a Wix-hosted lifestyle photo with descriptive alt text", () => {
      expect(photo.src).toMatch(/^https:\/\/static\.wixstatic\.com\//);
      expect(photo.alt.length).toBeGreaterThan(20);
      expect(photo.width).toBeGreaterThan(0);
      expect(photo.height).toBeGreaterThan(0);
    });

    it("ships at least 3 hotspots so the framing reads as intentional", () => {
      expect(configs.length).toBeGreaterThanOrEqual(3);
    });

    it("every hotspot has in-bounds coordinates and a URL-safe slug", () => {
      for (const cfg of configs) {
        expect(cfg.xPct).toBeGreaterThanOrEqual(0);
        expect(cfg.xPct).toBeLessThanOrEqual(100);
        expect(cfg.yPct).toBeGreaterThanOrEqual(0);
        expect(cfg.yPct).toBeLessThanOrEqual(100);
        expect(cfg.productSlug).toMatch(/^[a-z0-9-]+$/);
      }
    });

    it("uses unique hotspot ids", () => {
      const ids = configs.map((s: HotspotConfig) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  },
);

describe("ShopTheRoom — surface differentiation", () => {
  it("home and about scenes use different photos (no double-render)", () => {
    expect(HOME_HERO_PHOTO.src).not.toBe(ABOUT_HERO_PHOTO.src);
  });

  it("home and shop scenes use different photos", () => {
    expect(HOME_HERO_PHOTO.src).not.toBe(SHOP_HERO_PHOTO.src);
  });

  it("about and shop scenes use different photos", () => {
    expect(ABOUT_HERO_PHOTO.src).not.toBe(SHOP_HERO_PHOTO.src);
  });

  // HERO_SLIDES carousel deduplication tests removed on feat/cf-theme-C-seacat-luxury:
  // SeaCat hero is static copywritten text — no carousel, no deduplication constraint.

  it("HOME and FUTON_FRAMES_PLP intentionally share the same lifestyle-futon-frames asset", () => {
    // Documented cross-page repeat: visitor going home → 'Browse futons'
    // CTA → /shop/futon-frames sees the same scene with different
    // products tagged. Single source of truth lives in
    // LIFESTYLE_FUTON_FRAMES_PHOTO inside ShopTheRoom.tsx.
    expect(HOME_HERO_PHOTO.src).toBe(FUTON_FRAMES_PLP_HERO_PHOTO.src);
  });
});

describe("ShopTheRoom (live data resolution)", () => {
  it("resolves product name + price from getProductBySlug, never lying about catalog state", async () => {
    const hotspots = await __TEST__.resolveHotspots(HOME_HOTSPOT_CONFIGS);
    expect(hotspots).toHaveLength(3);
    const monterey = hotspots.find((h) => h.id === "monterey")!;
    expect(monterey.productName).toBe("Monterey Futon Frame");
    // Realistic format — Wix returns thousands-separated USD strings.
    expect(monterey.formattedPrice).toMatch(/^\$[0-9,]+\.\d{2}$/);
  });

  it("drops a hotspot whose slug 404s in the catalog (no broken PDP link rendered)", async () => {
    getProductBySlugMock.mockImplementation(async (slug: string) =>
      slug === "canby-mattress" ? null : product("X", 100),
    );
    const hotspots = await __TEST__.resolveHotspots(HOME_HOTSPOT_CONFIGS);
    expect(hotspots.find((h) => h.id === "canby")).toBeUndefined();
  });

  it("drops a hotspot whose product has no usable price (variant-priced products)", async () => {
    getProductBySlugMock.mockImplementation(async (slug: string) =>
      slug === "canby-mattress"
        ? { name: "Canby", priceData: { price: 0 } } // variant-priced sentinel
        : product("X", 100),
    );
    const hotspots = await __TEST__.resolveHotspots(HOME_HOTSPOT_CONFIGS);
    expect(hotspots.find((h) => h.id === "canby")).toBeUndefined();
  });

  it("falls back from formatted.price to numeric price when only the latter is present", async () => {
    getProductBySlugMock.mockImplementation(async () => ({
      name: "Numeric Only",
      priceData: { price: 12.5 },
    }));
    const hotspots = await __TEST__.resolveHotspots(HOME_HOTSPOT_CONFIGS);
    expect(hotspots[0]?.formattedPrice).toBe("$12.50");
  });
});

describe.each(SURFACES)(
  "ShopTheRoom — null fallback ($name surface drops to nothing if every slug 404s)",
  ({ configs }) => {
    it("returns null instead of an empty 'shop the room' header", async () => {
      getProductBySlugMock.mockResolvedValue(null);
      const ui = await ShopTheRoom({
        heroPhoto: HOME_HERO_PHOTO,
        hotspotConfigs: configs,
      });
      expect(ui).toBeNull();
    });
  },
);

describe("ShopTheRoom (render — home defaults)", () => {
  async function renderHome() {
    const ui = await ShopTheRoom({
      heroPhoto: HOME_HERO_PHOTO,
      hotspotConfigs: HOME_HOTSPOT_CONFIGS,
    });
    return render(ui!);
  }

  it("renders the default heading + lede when no copy props are supplied", async () => {
    await renderHome();
    expect(
      screen.getByRole("heading", { level: 2, name: /tap a piece you like/i }),
    ).toBeInTheDocument();
  });

  it("renders the lifestyle hero image with the configured alt", async () => {
    await renderHome();
    expect(
      screen.getByRole("img", { name: /sunlit living room.*futon/i }),
    ).toBeInTheDocument();
  });

  it("renders one dot per resolved hotspot, named after the live catalog product", async () => {
    await renderHome();
    expect(
      screen.getByRole("button", { name: /shop monterey futon frame/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /shop kingston futon frame/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /shop canby mattress/i }),
    ).toBeInTheDocument();
  });

  it("ties the section heading to the wrapping <section> via the default headingId", async () => {
    const { container } = await renderHome();
    const section = container.querySelector("section");
    expect(section?.getAttribute("aria-labelledby")).toBe(
      "shop-the-room-heading",
    );
  });

  it("returns null if every product 404s", async () => {
    getProductBySlugMock.mockResolvedValue(null);
    const ui = await ShopTheRoom({
      heroPhoto: HOME_HERO_PHOTO,
      hotspotConfigs: HOME_HOTSPOT_CONFIGS,
    });
    expect(ui).toBeNull();
  });
});

describe("ShopTheRoom (render — per-surface copy)", () => {
  it("/about surface renders its own eyebrow + heading + headingId", async () => {
    const ui = await ShopTheRoom({
      headingId: "about-shop-the-room-heading",
      eyebrow: "See it in a real bedroom",
      heading: "The pieces in this story",
      heroPhoto: ABOUT_HERO_PHOTO,
      hotspotConfigs: ABOUT_HOTSPOT_CONFIGS,
    });
    const { container } = render(ui!);
    expect(
      screen.getByRole("heading", { level: 2, name: /the pieces in this story/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/see it in a real bedroom/i)).toBeInTheDocument();
    expect(
      container.querySelector("section")?.getAttribute("aria-labelledby"),
    ).toBe("about-shop-the-room-heading");
  });

  it("/shop surface renders its own heading copy", async () => {
    const ui = await ShopTheRoom({
      headingId: "shop-shop-the-room-heading",
      eyebrow: "Shop the room",
      heading: "Or jump straight in",
      heroPhoto: SHOP_HERO_PHOTO,
      hotspotConfigs: SHOP_HOTSPOT_CONFIGS,
    });
    render(ui!);
    expect(
      screen.getByRole("heading", { level: 2, name: /or jump straight in/i }),
    ).toBeInTheDocument();
  });
});
