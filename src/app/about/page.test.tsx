import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
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

// cf-7pk0 F1: stub SiteContent so the helper falls back to baked-in
// copy under jsdom + tests can assert per-key fallback behavior.
const mockGetSiteContent = vi.fn();
vi.mock("@/lib/cms/site-content", () => ({
  getSiteContent: (...args: unknown[]) => mockGetSiteContent(...args),
}));

import AboutPage, { metadata } from "./page";
import { BUSINESS } from "@/lib/business/contact-info";

beforeEach(() => {
  mockGetSiteContent.mockReset();
  // Default: SiteContent empty → return the fallback the caller supplied.
  mockGetSiteContent.mockImplementation(async (_key, fallback) => fallback);
});

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

  // design-migration: v3 mascot hero + timeline replace v2 botanical components.
  it("renders the v3 mascot world hero band (replaces BotanicalMountainSkyline)", async () => {
    const { container } = await renderAbout();
    // MascotWorldHero is a client component; JSDOM renders its SVG stub.
    // Confirm the about-illustration wrapper is present — the slot is the
    // stable contract even when the inner SVG is hydrated client-side.
    expect(container.querySelector("[data-slot='about-illustration']")).not.toBeNull();
  });

  it("renders the MascotTimeline milestone strip (replaces BotanicalTimeline)", async () => {
    const { container } = await renderAbout();
    expect(container.querySelector("[data-slot='mascot-timeline']")).not.toBeNull();
  });

  it("renders the character ensemble team section (replaces TeamPortrait)", async () => {
    const { container } = await renderAbout();
    expect(container.querySelector("[data-slot='character-ensemble']")).not.toBeNull();
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

// cf-7pk0 F1 — owner-editable About copy via SiteContent. Mirrors the
// cfw-22e pattern shipped on /visit (10 site-content keys with documented
// fallbacks). 11 keys for /about: intro {eyebrow, heading, subheading,
// lede}, beliefs {heading, body-1, body-2}, location {heading, body-1},
// team {heading, body}. location.body-2 stays inline-JSX because it
// embeds <a> links around phone/email — SiteContent values are plain
// strings, can't wrap JSX.
describe("AboutPage — owner-editable copy (cf-7pk0 F1)", () => {
  it("falls back to baked-in About copy when SiteContent is empty", async () => {
    await renderAbout();
    expect(screen.getByText("Our story")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: /About Carolina Futons/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Family-owned and independently operated/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /What we believe/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /Where to find us/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /The team/i }),
    ).toBeInTheDocument();
  });

  it("uses SiteContent values for the intro section when present", async () => {
    mockGetSiteContent.mockImplementation(async (key, fallback) => {
      if (key === "about.intro.eyebrow") return "Our journey";
      if (key === "about.intro.heading") return "About Us at Carolina Futons";
      if (key === "about.intro.subheading") return "Independent and proud, Hendersonville NC.";
      if (key === "about.intro.lede") return "We open with a single idea: build to last.";
      return fallback;
    });
    await renderAbout();
    expect(screen.getByText("Our journey")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "About Us at Carolina Futons" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Independent and proud, Hendersonville NC.")).toBeInTheDocument();
    expect(screen.getByText("We open with a single idea: build to last.")).toBeInTheDocument();
  });

  it("uses SiteContent values for the beliefs section when present", async () => {
    mockGetSiteContent.mockImplementation(async (key, fallback) => {
      if (key === "about.beliefs.heading") return "Our promise";
      if (key === "about.beliefs.body-1") return "Repairable furniture by craftsmen.";
      if (key === "about.beliefs.body-2") return "Honest pricing, no decoded sales.";
      return fallback;
    });
    await renderAbout();
    expect(
      screen.getByRole("heading", { level: 2, name: "Our promise" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Repairable furniture by craftsmen.")).toBeInTheDocument();
    expect(screen.getByText("Honest pricing, no decoded sales.")).toBeInTheDocument();
  });

  it("uses SiteContent values for the location + team sections when present", async () => {
    mockGetSiteContent.mockImplementation(async (key, fallback) => {
      if (key === "about.location.heading") return "Find the showroom";
      if (key === "about.location.body-1") return "Drop by anytime during hours.";
      if (key === "about.team.heading") return "Who we are";
      if (key === "about.team.body") return "Bios coming soon — email us in the meantime.";
      return fallback;
    });
    await renderAbout();
    expect(
      screen.getByRole("heading", { level: 2, name: "Find the showroom" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Drop by anytime during hours.")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Who we are" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Bios coming soon — email us in the meantime.")).toBeInTheDocument();
  });

  it("queries the 11 expected SiteContent keys", async () => {
    await renderAbout();
    const keys = mockGetSiteContent.mock.calls.map(([key]) => key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "about.intro.eyebrow",
        "about.intro.heading",
        "about.intro.subheading",
        "about.intro.lede",
        "about.beliefs.heading",
        "about.beliefs.body-1",
        "about.beliefs.body-2",
        "about.location.heading",
        "about.location.body-1",
        "about.team.heading",
        "about.team.body",
      ]),
    );
  });
});
