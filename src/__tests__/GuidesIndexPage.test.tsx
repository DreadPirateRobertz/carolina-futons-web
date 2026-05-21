import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  flush: vi.fn().mockResolvedValue(true),
}));

const mockGetSiteContent = vi.fn();
vi.mock("@/lib/cms/site-content", () => ({
  getSiteContent: (...args: unknown[]) => mockGetSiteContent(...args),
}));

const listGuidesMock = vi.fn();
vi.mock("@/lib/discovery/guides", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/discovery/guides")>();
  return { ...original, listGuides: (...args: unknown[]) => listGuidesMock(...args) };
});

import GuidesIndexPage, { metadata } from "@/app/guides/page";
import { GUIDES } from "@/lib/discovery/guides";

beforeEach(() => {
  listGuidesMock.mockReset();
  listGuidesMock.mockResolvedValue(GUIDES);
  mockGetSiteContent.mockReset();
  mockGetSiteContent.mockImplementation(async (_key: string, fallback: string) => fallback);
});

describe("GuidesIndexPage", () => {
  it("exports metadata with a buying-guides title", () => {
    expect(metadata.title).toMatch(/Buying Guides.*Carolina Futons/);
    expect(typeof metadata.description).toBe("string");
  });

  it("renders the hero h1", async () => {
    const ui = await GuidesIndexPage();
    render(ui);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /figure out what you actually need/i,
      }),
    ).toBeTruthy();
  });

  it("renders a card link per guide entry pointing at /guides/{slug}", async () => {
    const ui = await GuidesIndexPage();
    render(ui);
    for (const guide of GUIDES) {
      const heading = screen.getByRole("heading", {
        level: 2,
        name: guide.title,
      });
      const link = heading.closest("a");
      expect(link).toBeTruthy();
      expect(link?.getAttribute("href")).toBe(`/guides/${guide.slug}`);
    }
  });

  it("renders a cover image for each guide that has a coverImageUrl", async () => {
    const { container } = render(await GuidesIndexPage());
    // next/image with alt="" has role=presentation; query the DOM directly.
    const imgCount = container.querySelectorAll("img").length;
    const coverCount = GUIDES.filter((g) => g.coverImageUrl).length;
    expect(imgCount).toBeGreaterThanOrEqual(coverCount);
  });

  it("uses CMS data when listGuides returns custom results", async () => {
    listGuidesMock.mockResolvedValue([
      {
        slug: "test-cms-guide",
        title: "CMS Guide Title",
        hook: "A guide from the CMS.",
        readingTimeMin: 3,
        coverImageUrl: null,
      },
    ]);
    const ui = await GuidesIndexPage();
    render(ui);
    expect(
      screen.getByRole("heading", { level: 2, name: "CMS Guide Title" }),
    ).toBeTruthy();
  });
});
