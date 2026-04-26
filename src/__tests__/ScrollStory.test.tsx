import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { ScrollStory } from "@/components/about/ScrollStory";

// cf-ypvd.5: contract tests for the scrolltelling /about chapter component.
// Verifies structure, accessibility hooks, and chapter content — motion
// behavior is covered by framer-motion internals + MotionProvider integration.

describe("ScrollStory", () => {
  it("renders the section with data-slot='scroll-story'", () => {
    const { container } = render(<ScrollStory />);
    expect(container.querySelector("[data-slot='scroll-story']")).not.toBeNull();
  });

  it("renders exactly four chapter panels", () => {
    const { container } = render(<ScrollStory />);
    const chapters = container.querySelectorAll("[data-slot^='scroll-chapter-']");
    expect(chapters).toHaveLength(4);
  });

  it("includes an sr-only heading that names the timeline for AT users", () => {
    render(<ScrollStory />);
    expect(screen.getByText(/three decades, four waypoints/i)).toBeInTheDocument();
  });

  it("renders all four chapter headings", () => {
    render(<ScrollStory />);
    expect(screen.getByText(/An idea from the mountains/i)).toBeInTheDocument();
    expect(screen.getByText(/All hardwood, all American/i)).toBeInTheDocument();
    expect(screen.getByText(/Come and sit on them/i)).toBeInTheDocument();
    expect(screen.getByText(/Still here, still the same/i)).toBeInTheDocument();
  });

  it("renders year badges for all four chapters", () => {
    const { container } = render(<ScrollStory />);
    const badges = container.querySelectorAll("[data-slot='chapter-year']");
    expect(badges).toHaveLength(4);
    const texts = Array.from(badges).map((b) => b.textContent?.trim());
    expect(texts).toEqual(["1991", "2005", "2015", "Now"]);
  });

  it("renders all four eyebrow labels", () => {
    render(<ScrollStory />);
    expect(screen.getByText("Founding")).toBeInTheDocument();
    expect(screen.getByText("The frames")).toBeInTheDocument();
    expect(screen.getByText("The showroom")).toBeInTheDocument();
    expect(screen.getByText("Today")).toBeInTheDocument();
  });

  it("chapter year badges carry aria-hidden to avoid duplicate year reads", () => {
    const { container } = render(<ScrollStory />);
    const badges = container.querySelectorAll("[data-slot='chapter-year']");
    for (const badge of badges) {
      expect(badge.getAttribute("aria-hidden")).toBe("true");
    }
  });
});
