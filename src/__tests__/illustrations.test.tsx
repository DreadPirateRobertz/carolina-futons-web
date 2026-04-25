import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { FooterMountainDivider } from "@/components/illustrations/FooterMountainDivider";
import { LivingSky } from "@/components/illustrations/LivingSky";
import { MountainSkyline } from "@/components/illustrations/MountainSkyline";
import { BlueRidgeTimeline } from "@/components/illustrations/BlueRidgeTimeline";
import { ContactHero } from "@/components/illustrations/ContactHero";

// cf-93rb Phase A: contract tests for the illustration wrappers.
// Decorative components (FooterMountainDivider, MountainSkyline) must
// remain hidden from AT to avoid noisy alt-text in the SR linearization.
// Meaningful components (LivingSky, BlueRidgeTimeline, ContactHero) ship
// with a default alt that mirrors the source SVG <title> and accept an
// override for placement-specific descriptions.

function srcOf(node: HTMLElement): string {
  return decodeURIComponent(node.getAttribute("src") ?? "");
}

describe("FooterMountainDivider", () => {
  it("is decorative — empty alt and aria-hidden wrapper", () => {
    const { container } = render(<FooterMountainDivider />);
    const wrapper = container.querySelector(
      "[data-slot='footer-mountain-divider']",
    );
    expect(wrapper).not.toBeNull();
    expect(wrapper?.getAttribute("aria-hidden")).toBe("true");
    // next/image renders an <img> with the alt attribute we passed.
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("alt")).toBe("");
    expect(srcOf(img as HTMLElement)).toContain(
      "footer-mountain-divider.svg",
    );
  });
});

describe("LivingSky", () => {
  it("renders meaningful alt text by default", () => {
    render(<LivingSky />);
    const img = screen.getByAltText(/blue ridge mountain skyline/i);
    expect(srcOf(img as HTMLElement)).toContain("living-sky.svg");
  });

  it("accepts a custom alt for placement-specific descriptions", () => {
    render(<LivingSky alt="Skyline above the press section" />);
    expect(
      screen.getByAltText(/skyline above the press section/i),
    ).toBeInTheDocument();
  });

  it("merges a caller-supplied className onto the wrapper", () => {
    const { container } = render(<LivingSky className="opacity-60" />);
    const wrapper = container.querySelector("[data-slot='living-sky']");
    expect(wrapper?.className).toContain("opacity-60");
    // Defaults still present so the wrapper stays full-width + non-interactive.
    expect(wrapper?.className).toContain("w-full");
    expect(wrapper?.className).toContain("pointer-events-none");
  });
});

describe("MountainSkyline", () => {
  it("is decorative — empty alt and aria-hidden wrapper", () => {
    const { container } = render(<MountainSkyline />);
    const wrapper = container.querySelector(
      "[data-slot='mountain-skyline']",
    );
    expect(wrapper?.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector("img")?.getAttribute("alt")).toBe("");
  });
});

describe("BlueRidgeTimeline", () => {
  it("renders the company-history alt by default", () => {
    render(<BlueRidgeTimeline />);
    const img = screen.getByAltText(
      /carolina futons company milestones from 1991 to present/i,
    );
    expect(srcOf(img as HTMLElement)).toContain("blue-ridge-timeline.svg");
  });

  it("accepts a custom alt", () => {
    render(<BlueRidgeTimeline alt="About-page hero" />);
    expect(screen.getByAltText("About-page hero")).toBeInTheDocument();
  });
});

describe("ContactHero", () => {
  it("renders the sunrise alt by default", () => {
    render(<ContactHero />);
    const img = screen.getByAltText(/sunrise/i);
    expect(srcOf(img as HTMLElement)).toContain("contact-hero.svg");
  });
});
