import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

// Spy ShopTheRoom so the call-site contract (right photo + configs +
// headingId) is pinned for /shop. Behavioral coverage of the section
// itself is in ShopTheRoom.test.tsx.
const stubs = vi.hoisted(() => ({
  shopTheRoomMock: (() => {
    const calls: unknown[][] = [];
    function fn(props: unknown) {
      calls.push([props]);
      return null;
    }
    (fn as unknown as { mock: { calls: unknown[][] } }).mock = { calls };
    (fn as unknown as { mockClear: () => void }).mockClear = () => {
      calls.length = 0;
    };
    return fn;
  })(),
  SHOP_HERO_PHOTO: { src: "stub-shop", alt: "stub", width: 1, height: 1 },
  SHOP_HOTSPOT_CONFIGS: [
    { id: "stub-shop", xPct: 50, yPct: 50, productSlug: "stub" },
  ],
}));
vi.mock("@/components/site/ShopTheRoom", () => ({
  ShopTheRoom: (props: unknown) => {
    stubs.shopTheRoomMock(props);
    return <div data-slot="shop-the-room" />;
  },
  SHOP_HERO_PHOTO: stubs.SHOP_HERO_PHOTO,
  SHOP_HOTSPOT_CONFIGS: stubs.SHOP_HOTSPOT_CONFIGS,
}));

import ShopIndex, { metadata } from "./page";

async function renderShop() {
  const ui = await ShopIndex();
  return render(ui);
}

afterEach(() => {
  cleanup();
  (stubs.shopTheRoomMock as unknown as { mockClear: () => void }).mockClear();
});

describe("ShopIndex — smoke", () => {
  it("exports metadata.title for /shop SEO", () => {
    expect(typeof metadata.title).toBe("string");
    expect(metadata.title as string).toMatch(/Shop/);
  });

  it("renders the Shop H1 + the category list", async () => {
    await renderShop();
    expect(
      screen.getByRole("heading", { level: 1, name: /^shop$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /futon|murphy|platform|mattress/i })
        .length,
    ).toBeGreaterThan(0);
  });

  it("renders the ShopTheRoom hotspots section", async () => {
    const { container } = await renderShop();
    expect(container.querySelector("[data-slot='shop-the-room']")).not.toBeNull();
  });

  it("passes the /shop-specific photo + heading + headingId to ShopTheRoom", async () => {
    await renderShop();
    const calls = (stubs.shopTheRoomMock as unknown as {
      mock: { calls: unknown[][] };
    }).mock.calls;
    expect(calls).toHaveLength(1);
    const props = calls[0]![0] as Record<string, unknown>;
    expect(props.heroPhoto).toBe(stubs.SHOP_HERO_PHOTO);
    expect(props.hotspotConfigs).toBe(stubs.SHOP_HOTSPOT_CONFIGS);
    expect(props.headingId).toBe("shop-shop-the-room-heading");
    expect(props.heading).toMatch(/jump straight in/i);
  });

  it("renders ShopTheRoom AFTER the category grid (not above the H1)", async () => {
    const { container } = await renderShop();
    const grid = container.querySelector("ul");
    const shopTheRoom = container.querySelector("[data-slot='shop-the-room']");
    expect(grid).not.toBeNull();
    expect(shopTheRoom).not.toBeNull();
    expect(
      grid!.compareDocumentPosition(shopTheRoom!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

describe("ShopIndex — dark mode (cf-b3ai)", () => {
  it("carries dark:text-zinc-100 on the Shop H1", async () => {
    const { container } = await renderShop();
    const h1 = container.querySelector("h1");
    expect(h1?.className).toContain("dark:text-zinc-100");
  });

  it("carries dark:border-zinc-700 and dark:hover:border-zinc-500 on each category card", async () => {
    const { container } = await renderShop();
    const cards = container.querySelectorAll("ul > li");
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(card.className).toContain("dark:border-zinc-700");
      expect(card.className).toContain("dark:hover:border-zinc-500");
    }
  });

  it("carries dark:focus-within:border-zinc-500 on each category card for keyboard nav", async () => {
    const { container } = await renderShop();
    const cards = container.querySelectorAll("ul > li");
    for (const card of cards) {
      expect(card.className).toContain("dark:focus-within:border-zinc-500");
    }
  });

  it("carries dark:text-zinc-100 on category name headings", async () => {
    const { container } = await renderShop();
    const headings = container.querySelectorAll("ul li h2");
    expect(headings.length).toBeGreaterThan(0);
    for (const h of headings) {
      expect(h.className).toContain("dark:text-zinc-100");
    }
  });

  it("carries dark:text-zinc-400 on category description paragraphs", async () => {
    const { container } = await renderShop();
    const descs = container.querySelectorAll("ul li p");
    expect(descs.length).toBeGreaterThan(0);
    for (const p of descs) {
      expect(p.className).toContain("dark:text-zinc-400");
    }
  });
});
