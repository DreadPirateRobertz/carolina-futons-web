import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

// Stub ShopTheRoom so the AboutPage smoke test doesn't need the Wix
// product fetch wired up; the section's own contract is covered by
// ShopTheRoom.test.tsx. Spy the mock so we can pin the call-site
// contract — a future swap of ABOUT_HERO_PHOTO into a different page
// would otherwise compile + pass tests silently.
const stubs = vi.hoisted(() => ({
  shopTheRoomMock: (() => {
    // Return a function that captures call args but renders a placeholder.
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
  ABOUT_HERO_PHOTO: { src: "stub-about", alt: "stub", width: 1, height: 1 },
  ABOUT_HOTSPOT_CONFIGS: [
    { id: "stub-about", xPct: 50, yPct: 50, productSlug: "stub" },
  ],
}));
vi.mock("@/components/site/ShopTheRoom", () => ({
  ShopTheRoom: (props: unknown) => {
    stubs.shopTheRoomMock(props);
    return <div data-slot="shop-the-room" />;
  },
  ABOUT_HERO_PHOTO: stubs.ABOUT_HERO_PHOTO,
  ABOUT_HOTSPOT_CONFIGS: stubs.ABOUT_HOTSPOT_CONFIGS,
}));

import AboutPage, { metadata } from "./page";
import { BUSINESS } from "@/lib/business/contact-info";

// AboutPage became async when the ShopTheRoom section landed (cf-delight
// Phase 3); resolve the JSX once per test so render() gets the actual
// element tree.
async function renderAbout() {
  const ui = await AboutPage();
  return render(ui);
}

afterEach(() => {
  cleanup();
  (stubs.shopTheRoomMock as unknown as { mockClear: () => void }).mockClear();
});

describe("AboutPage — smoke", () => {
  it("exports metadata.title containing 'About' for the /about tab/SEO", () => {
    expect(typeof metadata.title).toBe("string");
    expect(metadata.title as string).toMatch(/About/);
  });

  it("renders an h1 naming the page", async () => {
    await renderAbout();
    expect(screen.getByRole("heading", { level: 1 })).toBeDefined();
  });

  it("surfaces the 1991 founding year so the family-owned-since story is visible", async () => {
    await renderAbout();
    expect(screen.getAllByText(/1991/).length).toBeGreaterThan(0);
  });

  it("renders the Hendersonville storefront address from BUSINESS", async () => {
    await renderAbout();
    expect(screen.getAllByText(new RegExp(BUSINESS.street, "i")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(new RegExp(BUSINESS.city, "i")).length).toBeGreaterThan(0);
  });

  it("renders the decorative MountainSkyline header band", async () => {
    const { container } = await renderAbout();
    expect(
      container.querySelector("[data-slot='mountain-skyline']"),
    ).not.toBeNull();
  });

  it("renders the ScrollStory chapter timeline replacing the static milestone strip", async () => {
    const { container } = await renderAbout();
    expect(container.querySelector("[data-slot='scroll-story']")).not.toBeNull();
  });

  it("ScrollStory renders all four chapters (Founding, frames, showroom, today)", async () => {
    await renderAbout();
    expect(screen.getByText(/An idea from the mountains/i)).toBeInTheDocument();
    expect(screen.getByText(/All hardwood, all American/i)).toBeInTheDocument();
    expect(screen.getByText(/Come and sit on them/i)).toBeInTheDocument();
    expect(screen.getByText(/Still here, still the same/i)).toBeInTheDocument();
  });

  // cf-delight: pin the ShopTheRoom section was wired in.
  it("renders the ShopTheRoom hotspots section", async () => {
    const { container } = await renderAbout();
    expect(container.querySelector("[data-slot='shop-the-room']")).not.toBeNull();
  });

  it("passes the /about-specific photo + heading + headingId to ShopTheRoom", async () => {
    await renderAbout();
    const calls = (stubs.shopTheRoomMock as unknown as {
      mock: { calls: unknown[][] };
    }).mock.calls;
    expect(calls).toHaveLength(1);
    const props = calls[0]![0] as Record<string, unknown>;
    expect(props.heroPhoto).toBe(stubs.ABOUT_HERO_PHOTO);
    expect(props.hotspotConfigs).toBe(stubs.ABOUT_HOTSPOT_CONFIGS);
    expect(props.headingId).toBe("about-shop-the-room-heading");
    expect(props.heading).toMatch(/pieces in this story/i);
  });

  it("renders ShopTheRoom AFTER the article body (not above the prose)", async () => {
    const { container } = await renderAbout();
    const article = container.querySelector("article");
    const shopTheRoom = container.querySelector("[data-slot='shop-the-room']");
    expect(article).not.toBeNull();
    expect(shopTheRoom).not.toBeNull();
    expect(
      article!.compareDocumentPosition(shopTheRoom!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
