import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

import { FooterMountainDivider } from "@/components/illustrations/FooterMountainDivider";
import { LivingSky } from "@/components/illustrations/LivingSky";
import { LivingSkyClient } from "@/components/illustrations/LivingSkyClient";
import { MountainSkyline } from "@/components/illustrations/MountainSkyline";
import { BlueRidgeTimeline } from "@/components/illustrations/BlueRidgeTimeline";
import { ContactHero } from "@/components/illustrations/ContactHero";
import { LIVING_SKY_SVG_BODY } from "@/lib/illustrations/living-sky-svg";

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
  // cf-93rb-livingsky-dynamic: LivingSky now mounts the dynamic Client
  // Component which inlines the full SVG body and ticks the time-of-day
  // engine. The wrapper contract stays the same — data-slot + className
  // merge — so the rest of the page places it identically to the
  // previous static facade.
  it("mounts the dynamic SVG slot inside its wrapper", () => {
    const { container } = render(<LivingSky />);
    const wrapper = container.querySelector("[data-slot='living-sky']");
    expect(wrapper).not.toBeNull();
    expect(
      container.querySelector("[data-slot='living-sky-svg']"),
    ).not.toBeNull();
  });

  it("inlines the SVG with the canonical living-sky title for AT users", () => {
    const { container } = render(<LivingSky />);
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.innerHTML).toContain("Blue Ridge mountain skyline");
  });

  it("merges a caller-supplied className onto the wrapper", () => {
    const { container } = render(<LivingSky className="opacity-60" />);
    const wrapper = container.querySelector("[data-slot='living-sky']");
    expect(wrapper?.className).toContain("opacity-60");
    expect(wrapper?.className).toContain("w-full");
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
  // cf-about-illus: upgraded from static next/image to inline SVG with
  // LivingSky overlay.  The <title> inside the SVG body provides the
  // accessible name; there is no longer an <img> element.
  it("renders the data-slot wrapper", () => {
    const { container } = render(<BlueRidgeTimeline />);
    expect(container.querySelector("[data-slot='blue-ridge-timeline']")).not.toBeNull();
  });

  it("inlines an SVG with the company-history title for AT users", () => {
    const { container } = render(<BlueRidgeTimeline />);
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.innerHTML).toContain("Carolina Futons company milestones");
  });
});

describe("ContactHero", () => {
  it("renders the sunrise alt by default", () => {
    render(<ContactHero />);
    const img = screen.getByAltText(/sunrise/i);
    expect(srcOf(img as HTMLElement)).toContain("contact-hero.svg");
  });
});

describe("LIVING_SKY_SVG_BODY — SMIL animations", () => {
  it("stars group contains twinkling <animate> elements", () => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(LIVING_SKY_SVG_BODY, "image/svg+xml");
    const starsGroup = doc.getElementById("stars");
    expect(starsGroup).not.toBeNull();
    const animates = starsGroup!.querySelectorAll("animate[attributeName='opacity']");
    expect(animates.length).toBe(35);
    // Each has repeatCount="indefinite"
    for (const el of animates) {
      expect(el.getAttribute("repeatCount")).toBe("indefinite");
    }
  });

  it("cloud ellipses carry <animateTransform> drift", () => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(LIVING_SKY_SVG_BODY, "image/svg+xml");
    const secondary = doc.getElementById("cloud-secondary");
    const wisp2 = doc.getElementById("cloud-wisp-2");
    expect(secondary!.querySelector("animateTransform")).not.toBeNull();
    expect(wisp2!.querySelector("animateTransform")).not.toBeNull();
    expect(secondary!.querySelector("animateTransform")!.getAttribute("type")).toBe("translate");
  });

  it("firefly group circles carry blinking <animate> elements", () => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(LIVING_SKY_SVG_BODY, "image/svg+xml");
    const fireflyGroup = doc.getElementById("firefly-group");
    expect(fireflyGroup).not.toBeNull();
    const animates = fireflyGroup!.querySelectorAll("animate[attributeName='opacity']");
    expect(animates.length).toBe(16);
    // All firefly pulses start from 0 (blink in/out)
    for (const el of animates) {
      expect(el.getAttribute("values")).toMatch(/^0;/);
    }
  });

  it("star animate durations span four distinct buckets", () => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(LIVING_SKY_SVG_BODY, "image/svg+xml");
    const durations = new Set(
      Array.from(doc.getElementById("stars")!.querySelectorAll("animate"))
        .map((el) => el.getAttribute("dur")),
    );
    expect(durations.size).toBeGreaterThanOrEqual(4);
  });
});

describe("LivingSkyClient — reduced-motion SMIL control", () => {
  const pauseAnimations = vi.fn();
  const unpauseAnimations = vi.fn();

  beforeEach(() => {
    pauseAnimations.mockReset();
    unpauseAnimations.mockReset();
    Object.defineProperty(SVGElement.prototype, "pauseAnimations", {
      value: pauseAnimations,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(SVGElement.prototype, "unpauseAnimations", {
      value: unpauseAnimations,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls pauseAnimations on the SVG when prefers-reduced-motion is active", async () => {
    Object.defineProperty(window, "matchMedia", {
      value: (_q: string) => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
      writable: true,
      configurable: true,
    });

    await act(async () => { render(<LivingSkyClient />); });

    expect(pauseAnimations).toHaveBeenCalledTimes(1);
    expect(unpauseAnimations).not.toHaveBeenCalled();
  });

  it("calls unpauseAnimations on the SVG when motion is allowed", async () => {
    Object.defineProperty(window, "matchMedia", {
      value: (_q: string) => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
      writable: true,
      configurable: true,
    });

    await act(async () => { render(<LivingSkyClient />); });

    expect(unpauseAnimations).toHaveBeenCalledTimes(1);
    expect(pauseAnimations).not.toHaveBeenCalled();
  });
});
