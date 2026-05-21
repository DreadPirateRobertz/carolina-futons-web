// cfw-udr (cfw-66o.13): Videos page copy wired to getSiteContent.
// Tests: fallback behavior, CMS-override, key naming convention.

import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";

const mockGetSiteContent = vi.fn();
vi.mock("@/lib/cms/site-content", () => ({
  getSiteContent: (...args: unknown[]) => mockGetSiteContent(...args),
}));

vi.mock("@/lib/cms/videos", () => ({
  listVideos: vi.fn().mockResolvedValue({ items: [] }),
}));

vi.mock("@/components/videos/VideoGallery", () => ({
  VideoGallery: () => null,
}));

vi.mock("@/components/motion/HeroReveal", () => ({
  HeroReveal: ({ children }: { children: React.ReactNode }) => children,
}));

import VideosPage from "@/app/videos/page";

const KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$/;

beforeEach(() => {
  mockGetSiteContent.mockReset();
  mockGetSiteContent.mockImplementation(async (_key: string, fallback = "") => fallback);
});

afterEach(() => {
  vi.clearAllMocks();
});

async function renderPage(): Promise<string> {
  return renderToStaticMarkup((await VideosPage()) as ReactElement);
}

describe("VideosPage — fallback rendering (cfw-udr)", () => {
  it("renders the eyebrow fallback 'Watch'", async () => {
    const html = await renderPage();
    expect(html).toContain("Watch");
  });

  it("renders the heading fallback 'Product Videos'", async () => {
    const html = await renderPage();
    expect(html).toContain("Product Videos");
  });

  it("renders the intro fallback text", async () => {
    const html = await renderPage();
    expect(html).toContain("futon frames, Murphy beds");
  });
});

describe("VideosPage — CMS override (cfw-udr)", () => {
  it("renders CMS value when getSiteContent returns override", async () => {
    mockGetSiteContent.mockImplementation(async (key: string, fallback = "") => {
      if (key === "videos.heading") return "Watch Our Products";
      return fallback;
    });
    const html = await renderPage();
    expect(html).toContain("Watch Our Products");
    expect(html).not.toContain("Product Videos");
  });

  it("renders CMS eyebrow override", async () => {
    mockGetSiteContent.mockImplementation(async (key: string, fallback = "") => {
      if (key === "videos.eyebrow") return "See It In Action";
      return fallback;
    });
    const html = await renderPage();
    expect(html).toContain("See It In Action");
  });
});

describe("VideosPage — key names (cfw-udr)", () => {
  it("calls getSiteContent with 'videos.eyebrow'", async () => {
    await renderPage();
    expect(mockGetSiteContent).toHaveBeenCalledWith(
      "videos.eyebrow",
      expect.any(String),
    );
  });

  it("calls getSiteContent with 'videos.heading'", async () => {
    await renderPage();
    expect(mockGetSiteContent).toHaveBeenCalledWith(
      "videos.heading",
      expect.any(String),
    );
  });

  it("calls getSiteContent with 'videos.intro'", async () => {
    await renderPage();
    expect(mockGetSiteContent).toHaveBeenCalledWith(
      "videos.intro",
      expect.any(String),
    );
  });

  it("all 3 videos.* keys follow the dotted-path / lowercase / hyphenated convention", async () => {
    await renderPage();
    const calledKeys = mockGetSiteContent.mock.calls.map(([key]) => key as string);
    const videosKeys = calledKeys.filter((k) => k.startsWith("videos."));
    expect(videosKeys).toHaveLength(3);
    for (const key of videosKeys) {
      expect(KEY_PATTERN.test(key), `key violates pattern: ${key}`).toBe(true);
    }
  });
});
