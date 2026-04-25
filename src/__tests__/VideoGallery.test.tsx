import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

import { VideoGallery } from "@/components/videos/VideoGallery";
import type { VideoEntry } from "@/lib/videos/catalog";

const FIXTURE: VideoEntry[] = [
  {
    id: "vid-a",
    title: "Asheville",
    description: "A futon.",
    category: "futon",
    source: "wix",
    videoUrl: "https://video.wixstatic.com/asheville.mp4",
    posterUrl: "https://static.wixstatic.com/asheville.jpg",
    productSlug: "asheville-futon-frame",
    sortOrder: 1,
  },
  {
    id: "vid-b",
    title: "Studio Conversion",
    description: "Sofa to bed.",
    category: "conversion",
    source: "wix",
    videoUrl: "https://video.wixstatic.com/studio.mp4",
    posterUrl: "https://static.wixstatic.com/studio.jpg",
    sortOrder: 2,
  },
  {
    id: "vid-c",
    title: "Nomad Assembly",
    description: "Step by step.",
    category: "assembly",
    source: "youtube",
    videoUrl: "https://www.youtube.com/watch?v=abc",
    embedUrl: "https://www.youtube.com/embed/abc",
    posterUrl: "https://img.youtube.com/vi/abc/hqdefault.jpg",
    productSlug: "nomad-platform-bed",
    sortOrder: 3,
  },
];

describe("VideoGallery", () => {
  it("renders all videos by default with title + description", () => {
    render(<VideoGallery videos={FIXTURE} />);
    expect(screen.getByText("Asheville")).toBeInTheDocument();
    expect(screen.getByText("Studio Conversion")).toBeInTheDocument();
    expect(screen.getByText("Nomad Assembly")).toBeInTheDocument();
  });

  it("renders the category filter tabs with All selected by default", () => {
    render(<VideoGallery videos={FIXTURE} />);
    const tablist = screen.getByRole("tablist", { name: /video category/i });
    const tabs = within(tablist).getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual([
      "All Videos",
      "Overview",
      "Futon Frames",
      "Conversion Demos",
      "Assembly Guides",
    ]);
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
  });

  it("filters to a single category when a tab is clicked", () => {
    render(<VideoGallery videos={FIXTURE} />);
    fireEvent.click(screen.getByRole("tab", { name: "Conversion Demos" }));
    expect(screen.queryByText("Asheville")).not.toBeInTheDocument();
    expect(screen.getByText("Studio Conversion")).toBeInTheDocument();
    expect(screen.queryByText("Nomad Assembly")).not.toBeInTheDocument();
  });

  it("shows an empty state when no videos match the filter", () => {
    render(<VideoGallery videos={[FIXTURE[0]]} />);
    fireEvent.click(screen.getByRole("tab", { name: "Assembly Guides" }));
    // Empty copy renders twice — once as a visible <p> and once as an
    // aria-live sr-only announcement for screen readers.
    expect(screen.getAllByText(/no videos in this category/i)).toHaveLength(2);
  });

  it("renders a Shop link only for videos with a productSlug", () => {
    render(<VideoGallery videos={FIXTURE} />);
    expect(
      screen.getByRole("link", { name: /shop the asheville/i }),
    ).toHaveAttribute("href", "/products/asheville-futon-frame");
    // Studio Conversion has no productSlug, so no Shop link for it
    expect(
      screen.queryByRole("link", { name: /shop the studio conversion/i }),
    ).toBeNull();
  });

  it("opens the lightbox dialog on play and closes on Escape", () => {
    render(<VideoGallery videos={FIXTURE} />);
    fireEvent.click(screen.getByRole("button", { name: /play asheville/i }));
    const dialog = screen.getByRole("dialog", { name: /now playing: asheville/i });
    expect(dialog).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(
      screen.queryByRole("dialog", { name: /now playing: asheville/i }),
    ).toBeNull();
  });

  it("renders a YouTube iframe for youtube source", () => {
    const { container } = render(<VideoGallery videos={[FIXTURE[2]]} />);
    fireEvent.click(screen.getByRole("button", { name: /play nomad/i }));
    const iframe = container.querySelector("iframe");
    expect(iframe?.getAttribute("src")).toBe(
      "https://www.youtube.com/embed/abc?autoplay=1",
    );
  });

  it("renders an HTML5 video element for wix source", () => {
    const { container } = render(<VideoGallery videos={[FIXTURE[0]]} />);
    fireEvent.click(screen.getByRole("button", { name: /play asheville/i }));
    const video = container.querySelector("video");
    expect(video?.getAttribute("src")).toBe(
      "https://video.wixstatic.com/asheville.mp4",
    );
  });
});
