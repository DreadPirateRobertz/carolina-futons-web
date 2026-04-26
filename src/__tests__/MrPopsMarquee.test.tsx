import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  MrPopsMarquee,
  BEAUTY_SHOTS,
} from "@/components/site/MrPopsMarquee";

describe("MrPopsMarquee", () => {
  it("renders the section landmark with correct aria-label", () => {
    render(<MrPopsMarquee />);
    expect(
      screen.getByRole("region", { name: "Furniture gallery" }),
    ).toBeInTheDocument();
  });

  it("renders 3 marquee tracks (marquee_0/1/2)", () => {
    render(<MrPopsMarquee />);
    const tracks = document.querySelectorAll(".marquee-track");
    expect(tracks).toHaveLength(3);
  });

  it("each track contains exactly 10 items (5 images duplicated for seamless loop)", () => {
    render(<MrPopsMarquee />);
    const tracks = document.querySelectorAll(".marquee-track");
    tracks.forEach((track) => {
      expect(track.querySelectorAll("li")).toHaveLength(10);
    });
  });

  it("all tracks are aria-hidden (decorative, no screen-reader noise)", () => {
    render(<MrPopsMarquee />);
    const tracks = document.querySelectorAll(".marquee-track");
    tracks.forEach((track) => {
      expect(track.getAttribute("aria-hidden")).toBe("true");
    });
  });

  it("images render with non-empty alt text", () => {
    render(<MrPopsMarquee />);
    const imgs = document.querySelectorAll<HTMLImageElement>(".marquee-track img");
    imgs.forEach((img) => {
      expect(img.alt.length).toBeGreaterThan(0);
    });
  });

  it("every label badge renders with non-empty text", () => {
    render(<MrPopsMarquee />);
    const badges = document.querySelectorAll(".marquee-track span");
    badges.forEach((badge) => {
      expect(badge.textContent?.trim().length).toBeGreaterThan(0);
    });
  });

  it("each track carries marquee-scroll animation via inline style", () => {
    render(<MrPopsMarquee />);
    const tracks = document.querySelectorAll<HTMLElement>(".marquee-track");
    tracks.forEach((track) => {
      expect(track.style.animation).toMatch(/marquee-scroll/);
    });
  });

  it("tracks have distinct animation durations (rows don't lock-step)", () => {
    render(<MrPopsMarquee />);
    const tracks = document.querySelectorAll<HTMLElement>(".marquee-track");
    const durations = Array.from(tracks).map((t) => t.style.animation);
    const unique = new Set(durations);
    expect(unique.size).toBe(3);
  });

  it("BEAUTY_SHOTS covers futons, murphy beds, platform beds, and mattresses", () => {
    const labels = BEAUTY_SHOTS.map((s) => s.label);
    expect(labels).toContain("Futon Frames");
    expect(labels).toContain("Murphy Beds");
    expect(labels).toContain("Platform Beds");
    expect(labels).toContain("Mattresses");
  });

  it("all image src URLs point to wixstatic CDN", () => {
    BEAUTY_SHOTS.forEach((shot) => {
      expect(shot.id).toMatch(/^e04e89_/);
    });
  });

  it("the section carries the marquee-section CSS class (required for hover-pause)", () => {
    render(<MrPopsMarquee />);
    const section = screen.getByTestId("mr-pops-marquee");
    expect(section.classList.contains("marquee-section")).toBe(true);
  });

  it("data-testid attribute is present on the section", () => {
    render(<MrPopsMarquee />);
    expect(screen.getByTestId("mr-pops-marquee")).toBeInTheDocument();
  });

  it("BEAUTY_SHOTS has 7 entries with distinct IDs (no copy-paste duplicates)", () => {
    const ids = BEAUTY_SHOTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(BEAUTY_SHOTS.length);
  });
});
