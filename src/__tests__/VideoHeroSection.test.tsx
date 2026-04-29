import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Stub useReducedMotion so we can exercise both branches.
const reduceMotionSpy = vi.fn<() => boolean | null>(() => false);
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>(
    "framer-motion",
  );
  return { ...actual, useReducedMotion: () => reduceMotionSpy() };
});

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

import { VideoHeroSection } from "@/components/home/VideoHeroSection";

beforeEach(() => {
  reduceMotionSpy.mockReturnValue(false);
});

describe("VideoHeroSection — structure", () => {
  it("renders with data-slot='video-hero'", () => {
    render(<VideoHeroSection />);
    expect(document.querySelector('[data-slot="video-hero"]')).not.toBeNull();
  });

  it("renders the headline", () => {
    render(<VideoHeroSection />);
    expect(
      screen.getByRole("heading", { level: 1, name: /furniture that earns its place/i }),
    ).toBeInTheDocument();
  });

  it("renders Browse all furniture link to /shop", () => {
    render(<VideoHeroSection />);
    expect(
      screen.getByRole("link", { name: /browse all furniture/i }),
    ).toHaveAttribute("href", "/shop");
  });

  it("renders Design a room link to /design-a-room", () => {
    render(<VideoHeroSection />);
    expect(
      screen.getByRole("link", { name: /design a room/i }),
    ).toHaveAttribute("href", "/design-a-room");
  });
});

describe("VideoHeroSection — video (motion enabled)", () => {
  it("renders a <video> element when reduced-motion is off", () => {
    render(<VideoHeroSection />);
    const video = document.querySelector("video");
    expect(video).not.toBeNull();
  });

  it("video has autoPlay muted loop playsInline", () => {
    render(<VideoHeroSection />);
    const video = document.querySelector("video")!;
    expect(video.autoplay).toBe(true);
    expect(video.muted).toBe(true);
    expect(video.loop).toBe(true);
    expect(video.hasAttribute("playsinline")).toBe(true);
  });

  it("video src points to vid-intro Wix asset", () => {
    render(<VideoHeroSection />);
    const video = document.querySelector("video")!;
    expect(video.getAttribute("src")).toContain(
      "e04e89_ea16ef6edfe64c03a5bfdd0ee468ab7f",
    );
  });

  it("video has a poster attribute for slow connections", () => {
    render(<VideoHeroSection />);
    const video = document.querySelector("video")!;
    expect(video.getAttribute("poster")).toContain(
      "e04e89_ea16ef6edfe64c03a5bfdd0ee468ab7f",
    );
  });

  it("video is aria-hidden (decorative — no captions needed for ambient bg)", () => {
    render(<VideoHeroSection />);
    const video = document.querySelector("video")!;
    expect(video.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders an unmute button when video is playing", () => {
    render(<VideoHeroSection />);
    expect(
      screen.getByRole("button", { name: /unmute video/i }),
    ).toBeInTheDocument();
  });

  it("toggles to mute label after clicking unmute", async () => {
    const user = userEvent.setup();
    render(<VideoHeroSection />);
    const btn = screen.getByRole("button", { name: /unmute video/i });
    await user.click(btn);
    expect(
      screen.getByRole("button", { name: /mute video/i }),
    ).toBeInTheDocument();
  });

  it("toggles back to unmute after clicking mute", async () => {
    const user = userEvent.setup();
    render(<VideoHeroSection />);
    await user.click(screen.getByRole("button", { name: /unmute video/i }));
    await user.click(screen.getByRole("button", { name: /mute video/i }));
    expect(
      screen.getByRole("button", { name: /unmute video/i }),
    ).toBeInTheDocument();
  });
});

describe("VideoHeroSection — reduced-motion branch", () => {
  beforeEach(() => {
    reduceMotionSpy.mockReturnValue(true);
  });

  it("does NOT render a <video> element when prefers-reduced-motion is set", () => {
    render(<VideoHeroSection />);
    expect(document.querySelector("video")).toBeNull();
  });

  it("does NOT render the unmute button when reduced-motion is set", () => {
    render(<VideoHeroSection />);
    expect(
      screen.queryByRole("button", { name: /unmute video/i }),
    ).toBeNull();
  });

  it("still renders the headline when reduced-motion is set", () => {
    render(<VideoHeroSection />);
    expect(
      screen.getByRole("heading", { level: 1 }),
    ).toBeInTheDocument();
  });
});
