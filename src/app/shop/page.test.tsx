import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type React from "react";

vi.mock("framer-motion", () => ({
  motion: {
    a: ({ children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children?: React.ReactNode }) => (
      <a {...rest}>{children}</a>
    ),
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div {...rest}>{children}</div>
    ),
    g: ({ children, ...rest }: React.SVGAttributes<SVGGElement> & { children?: React.ReactNode }) => (
      <g {...rest}>{children}</g>
    ),
  },
  useReducedMotion: () => false,
}));

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

describe("ShopIndex — mascot cards (cf-shop-mascot)", () => {
  it("renders one card per SHOP_CATEGORY (4+ cards)", async () => {
    const { container } = await renderShop();
    const cards = container.querySelectorAll("ul > li");
    expect(cards.length).toBeGreaterThanOrEqual(4);
  });

  it("each category card is an accessible link with a recognisable href", async () => {
    await renderShop();
    const links = screen.getAllByRole("link", { name: /futon|murphy|platform|mattress/i });
    expect(links.length).toBeGreaterThanOrEqual(4);
    for (const link of links) {
      expect(link.getAttribute("href")).toMatch(/^\/shop\//);
    }
  });
});
