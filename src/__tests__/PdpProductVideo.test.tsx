import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { PdpProductVideo } from "@/components/product/PdpProductVideo";
import { getVideoByProductSlug } from "@/lib/videos/catalog";
import type { VideoEntry } from "@/lib/videos/catalog";

const WIX_VIDEO: VideoEntry = {
  id: "vid-asheville",
  title: "Asheville",
  description: "The Asheville futon frame — a Night & Day Furniture classic.",
  category: "futon",
  source: "wix",
  videoUrl: "https://video.wixstatic.com/video/e04e89_c2e8bedf07c74b249894fffffc0564b7/1080p/mp4/file.mp4",
  posterUrl: "https://static.wixstatic.com/media/e04e89_c2e8bedf07c74b249894fffffc0564b7f000.jpg/v1/fill/w_640,h_360,q_80/file.jpg",
  productSlug: "asheville-futon-frame",
  sortOrder: 1,
};

const YOUTUBE_VIDEO: VideoEntry = {
  id: "v-kd-001",
  title: "Nomad Platform Bed Assembly",
  description: "Step-by-step assembly guide for the KD Frames Nomad Platform Bed.",
  category: "assembly",
  source: "youtube",
  videoUrl: "https://www.youtube.com/watch?v=EC1GCQ5CiSo",
  embedUrl: "https://www.youtube.com/embed/EC1GCQ5CiSo",
  posterUrl: "https://img.youtube.com/vi/EC1GCQ5CiSo/hqdefault.jpg",
  productSlug: "nomad-platform-bed",
  brand: "KD Frames",
  sortOrder: 100,
};

// ── getVideoByProductSlug ────────────────────────────────────────────────────

describe("getVideoByProductSlug", () => {
  it("returns the video entry for a matching slug", () => {
    const v = getVideoByProductSlug("asheville-futon-frame");
    expect(v).not.toBeNull();
    expect(v?.id).toBe("vid-asheville");
  });

  it("returns null for a slug with no video", () => {
    expect(getVideoByProductSlug("product-with-no-video")).toBeNull();
  });

  it("returns the nomad video for nomad-platform-bed", () => {
    const v = getVideoByProductSlug("nomad-platform-bed");
    expect(v?.source).toBe("youtube");
  });

  it("returns the sedona video for sedona-futon-frame", () => {
    const v = getVideoByProductSlug("sedona-futon-frame");
    expect(v?.id).toBe("vid-sedona");
  });
});

// ── PdpProductVideo ──────────────────────────────────────────────────────────

describe("PdpProductVideo", () => {
  it("renders a section landmark with the product title", () => {
    render(<PdpProductVideo video={WIX_VIDEO} />);
    expect(
      screen.getByRole("region", { name: /asheville product video/i }),
    ).toBeInTheDocument();
  });

  it("exposes the pdp-product-video data slot", () => {
    const { container } = render(<PdpProductVideo video={WIX_VIDEO} />);
    expect(container.querySelector('[data-slot="pdp-product-video"]')).not.toBeNull();
  });

  it("shows the play button before the video starts", () => {
    render(<PdpProductVideo video={WIX_VIDEO} />);
    expect(screen.getByTestId("pdp-video-play-btn")).toBeInTheDocument();
  });

  it("does not render the video player before play is clicked", () => {
    render(<PdpProductVideo video={WIX_VIDEO} />);
    expect(screen.queryByTestId("pdp-video-player")).toBeNull();
  });

  it("expands a native video player for wix source on play", () => {
    render(<PdpProductVideo video={WIX_VIDEO} />);
    fireEvent.click(screen.getByTestId("pdp-video-play-btn"));
    expect(screen.getByTestId("pdp-video-player")).toBeInTheDocument();
    expect(screen.queryByTestId("pdp-video-play-btn")).toBeNull();
  });

  it("expands an iframe for youtube source on play", () => {
    render(<PdpProductVideo video={YOUTUBE_VIDEO} />);
    fireEvent.click(screen.getByTestId("pdp-video-play-btn"));
    expect(screen.getByTestId("pdp-video-iframe")).toBeInTheDocument();
    expect(screen.queryByTestId("pdp-video-play-btn")).toBeNull();
  });

  it("the iframe src includes autoplay=1 for youtube", () => {
    render(<PdpProductVideo video={YOUTUBE_VIDEO} />);
    fireEvent.click(screen.getByTestId("pdp-video-play-btn"));
    const iframe = screen.getByTestId("pdp-video-iframe") as HTMLIFrameElement;
    expect(iframe.src).toContain("autoplay=1");
  });

  it("the native video src matches videoUrl", () => {
    render(<PdpProductVideo video={WIX_VIDEO} />);
    fireEvent.click(screen.getByTestId("pdp-video-play-btn"));
    const video = screen.getByTestId("pdp-video-player") as HTMLVideoElement;
    expect(video.src).toContain("wixstatic.com");
  });

  it("renders a See all videos link", () => {
    render(<PdpProductVideo video={WIX_VIDEO} />);
    expect(
      screen.getByRole("link", { name: /see all videos/i }),
    ).toHaveAttribute("href", "/videos");
  });

  it("renders the video title and description", () => {
    render(<PdpProductVideo video={WIX_VIDEO} />);
    expect(screen.getByText("Asheville")).toBeInTheDocument();
    expect(screen.getByText(/Night & Day Furniture classic/i)).toBeInTheDocument();
  });

  it("play button has accessible label", () => {
    render(<PdpProductVideo video={WIX_VIDEO} />);
    expect(
      screen.getByRole("button", { name: /play asheville product video/i }),
    ).toBeInTheDocument();
  });
});
