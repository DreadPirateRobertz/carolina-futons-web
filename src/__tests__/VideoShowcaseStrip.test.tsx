import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    fill: _fill,
    sizes: _sizes,
    ...rest
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    src: string;
    alt: string;
    fill?: boolean;
    sizes?: string;
  }) => <img src={src} alt={alt} {...rest} />,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { VideoShowcaseStrip } from "@/components/home/VideoShowcaseStrip";
import type { VideoEntry } from "@/lib/videos/catalog";

const VIDEOS: VideoEntry[] = [
  {
    id: "vid-asheville",
    title: "Asheville",
    description: "The Asheville futon frame — a Night & Day classic.",
    category: "futon",
    source: "wix",
    videoUrl:
      "https://video.wixstatic.com/video/e04e89_c2e8bedf07c74b249894fffffc0564b7/1080p/mp4/file.mp4",
    posterUrl:
      "https://static.wixstatic.com/media/e04e89_c2e8bedf07c74b249894fffffc0564b7f000.jpg/v1/fill/w_640,h_360,q_80/file.jpg",
    productSlug: "asheville-futon-frame",
    sortOrder: 1,
  },
  {
    id: "vid-studio-conversion",
    title: "Studio Conversion",
    description: "See the Studio futon convert from sofa to bed in seconds.",
    category: "conversion",
    source: "wix",
    videoUrl:
      "https://video.wixstatic.com/video/e04e89_d9ffa580eb5a4fa784bc6bb6a6105257/1080p/mp4/file.mp4",
    posterUrl:
      "https://static.wixstatic.com/media/e04e89_d9ffa580eb5a4fa784bc6bb6a6105257f000.jpg/v1/fill/w_640,h_360,q_80/file.jpg",
    sortOrder: 8,
  },
  {
    id: "vid-moonglider-conversion",
    title: "MoonGlider Conversion",
    description: "Watch the MoonGlider glide smoothly from sofa to sleeper.",
    category: "conversion",
    source: "wix",
    videoUrl:
      "https://video.wixstatic.com/video/e04e89_b8d2371453a0487abf8224d6256bdfe0/1080p/mp4/file.mp4",
    posterUrl:
      "https://static.wixstatic.com/media/e04e89_b8d2371453a0487abf8224d6256bdfe0f000.jpg/v1/fill/w_640,h_360,q_80/file.jpg",
    sortOrder: 10,
  },
];

function renderStrip() {
  return render(<VideoShowcaseStrip videos={VIDEOS} />);
}

describe("VideoShowcaseStrip — structure", () => {
  it("renders with data-slot='video-showcase-strip'", () => {
    renderStrip();
    expect(
      document.querySelector('[data-slot="video-showcase-strip"]'),
    ).not.toBeNull();
  });

  it("renders a 'See it in action' heading", () => {
    renderStrip();
    expect(
      screen.getByRole("heading", { name: /see it in action/i }),
    ).toBeInTheDocument();
  });

  it("renders a 'Watch all' link to /videos", () => {
    renderStrip();
    expect(
      screen.getByRole("link", { name: /watch all/i }),
    ).toHaveAttribute("href", "/videos");
  });

  it("renders one play button per video", () => {
    renderStrip();
    const btns = screen.getAllByRole("button", { name: /^play video:/i });
    expect(btns).toHaveLength(VIDEOS.length);
  });

  it("labels each button with the video title", () => {
    renderStrip();
    expect(
      screen.getByRole("button", { name: /play video: asheville/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /play video: studio conversion/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /play video: moonglider conversion/i }),
    ).toBeInTheDocument();
  });

  it("renders a poster image for each video", () => {
    renderStrip();
    const img = screen.getByRole("img", { name: "Asheville" });
    expect(img).toBeInTheDocument();
    expect(img.getAttribute("src")).toContain("wixstatic.com");
  });
});

describe("VideoShowcaseStrip — lightbox", () => {
  it("no lightbox visible on initial render", () => {
    renderStrip();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens a lightbox when a video card is clicked", async () => {
    const user = userEvent.setup();
    renderStrip();
    await user.click(
      screen.getByRole("button", { name: /play video: asheville/i }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: /now playing: asheville/i }),
    ).toBeInTheDocument();
  });

  it("lightbox renders a <video> with the correct src", async () => {
    const user = userEvent.setup();
    renderStrip();
    await user.click(
      screen.getByRole("button", { name: /play video: asheville/i }),
    );
    const video = screen.getByRole("dialog").querySelector("video");
    expect(video).not.toBeNull();
    expect(video!.getAttribute("src")).toContain(
      "e04e89_c2e8bedf07c74b249894fffffc0564b7",
    );
  });

  it("closes the lightbox on Escape key", async () => {
    const user = userEvent.setup();
    renderStrip();
    await user.click(
      screen.getByRole("button", { name: /play video: asheville/i }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes the lightbox when the Close button is clicked", async () => {
    const user = userEvent.setup();
    renderStrip();
    await user.click(
      screen.getByRole("button", { name: /play video: asheville/i }),
    );
    await user.click(screen.getByRole("button", { name: /close video/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes the lightbox when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    renderStrip();
    await user.click(
      screen.getByRole("button", { name: /play video: asheville/i }),
    );
    const dialog = screen.getByRole("dialog");
    // Click the backdrop (the dialog itself, not its inner content)
    await user.click(dialog);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows a Shop link for videos with a productSlug", async () => {
    const user = userEvent.setup();
    renderStrip();
    await user.click(
      screen.getByRole("button", { name: /play video: asheville/i }),
    );
    expect(
      screen.getByRole("link", { name: /shop the asheville/i }),
    ).toHaveAttribute("href", "/products/asheville-futon-frame");
  });

  it("does NOT show a Shop link for videos without a productSlug", async () => {
    const user = userEvent.setup();
    renderStrip();
    await user.click(
      screen.getByRole("button", { name: /play video: studio conversion/i }),
    );
    expect(screen.queryByRole("link", { name: /shop/i })).toBeNull();
  });
});

describe("VideoShowcaseStrip — empty / edge cases", () => {
  it("renders nothing problematic with an empty video list", () => {
    const { container } = render(<VideoShowcaseStrip videos={[]} />);
    // Section still renders; no play buttons
    expect(container.querySelector('[data-slot="video-showcase-strip"]')).not.toBeNull();
    expect(screen.queryAllByRole("button", { name: /^play video:/i })).toHaveLength(0);
  });
});

describe("VideoShowcaseStrip — mobile horizontal scroll snap", () => {
  it("video list has snap-x class for mobile scroll snap", () => {
    renderStrip();
    const list = document.querySelector('[data-slot="video-showcase-strip"] ul');
    expect(list?.classList.contains("snap-x")).toBe(true);
  });

  it("video list has snap-mandatory class for strict snap behavior", () => {
    renderStrip();
    const list = document.querySelector('[data-slot="video-showcase-strip"] ul');
    expect(list?.classList.contains("snap-mandatory")).toBe(true);
  });

  it("each video item has snap-start class", () => {
    renderStrip();
    const items = document.querySelectorAll('[data-slot="video-showcase-strip"] li');
    expect(items.length).toBeGreaterThan(0);
    items.forEach((item) => {
      expect(item.classList.contains("snap-start")).toBe(true);
    });
  });
});

describe("VideoShowcaseStrip — iOS autoplay poster fallback", () => {
  it("lightbox video has poster attribute for iOS Safari fallback", async () => {
    const user = userEvent.setup();
    renderStrip();
    await user.click(
      screen.getByRole("button", { name: /play video: asheville/i }),
    );
    const video = screen.getByRole("dialog").querySelector("video");
    expect(video).not.toBeNull();
    expect(video!.getAttribute("poster")).toContain("wixstatic.com");
  });

  it("lightbox video has playsInline attribute for iOS autoplay", async () => {
    const user = userEvent.setup();
    renderStrip();
    await user.click(
      screen.getByRole("button", { name: /play video: asheville/i }),
    );
    const video = screen.getByRole("dialog").querySelector("video");
    expect(video).not.toBeNull();
    expect(video!.hasAttribute("playsinline")).toBe(true);
  });
});
