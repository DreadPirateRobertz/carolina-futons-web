import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// cf-3qt.4.3: smoke tests for the /videos page.
// Verifies: metadata, H1, that the VideoGallery receives the items from
// listVideos, and fallback behavior when no videos are returned.
// VideoGallery is a client component with complex filter state; it's mocked
// here so the page smoke test doesn't depend on its internals.

const listVideosMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/cms/videos", () => ({
  listVideos: listVideosMock,
}));

vi.mock("@/components/motion/HeroReveal", () => ({
  HeroReveal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const VideoGalleryMock = vi.hoisted(() => vi.fn());
vi.mock("@/components/videos/VideoGallery", () => ({
  VideoGallery: (props: { videos: unknown[] }) => {
    VideoGalleryMock(props);
    return <div data-testid="video-gallery" data-count={props.videos.length} />;
  },
}));

import VideosPage, { metadata } from "@/app/videos/page";

const STUB_VIDEO = {
  _id: "v1",
  title: "Monterey Assembly",
  youtubeId: "abc123",
  category: "assembly" as const,
  sortOrder: 1,
  thumbnailUrl: undefined,
  description: "How to assemble the Monterey frame.",
};

beforeEach(() => {
  listVideosMock.mockReset();
  VideoGalleryMock.mockReset();
  listVideosMock.mockResolvedValue({ items: [] });
});

describe("VideosPage — metadata", () => {
  it("exports a metadata title containing 'Videos'", () => {
    expect(typeof metadata.title).toBe("string");
    expect(metadata.title as string).toMatch(/video/i);
  });

  it("exports a non-empty metadata description", () => {
    expect(typeof metadata.description).toBe("string");
    expect((metadata.description ?? "").length).toBeGreaterThan(0);
  });
});

describe("VideosPage — structure", () => {
  it("renders the H1 'Product Videos'", async () => {
    render(await VideosPage());
    expect(
      screen.getByRole("heading", { level: 1, name: /product videos/i }),
    ).toBeTruthy();
  });

  it("renders the VideoGallery component", async () => {
    render(await VideosPage());
    expect(screen.getByTestId("video-gallery")).toBeTruthy();
  });

  it("passes the listVideos items to VideoGallery", async () => {
    listVideosMock.mockResolvedValue({ items: [STUB_VIDEO] });
    render(await VideosPage());
    expect(VideoGalleryMock).toHaveBeenCalledWith(
      expect.objectContaining({ videos: [STUB_VIDEO] }),
    );
    expect(screen.getByTestId("video-gallery").getAttribute("data-count")).toBe("1");
  });

  it("passes an empty array to VideoGallery when listVideos returns no items", async () => {
    listVideosMock.mockResolvedValue({ items: [] });
    render(await VideosPage());
    expect(screen.getByTestId("video-gallery").getAttribute("data-count")).toBe("0");
  });

  it("passes fallback catalog items when listVideos signals fallback=true", async () => {
    listVideosMock.mockResolvedValue({ items: [STUB_VIDEO], fallback: true });
    render(await VideosPage());
    expect(screen.getByTestId("video-gallery").getAttribute("data-count")).toBe("1");
  });
});
