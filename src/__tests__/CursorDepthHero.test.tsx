import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { CursorDepthHero } from "@/components/site/CursorDepthHero";

// cf-ypvd.7: contract tests for the 3-layer cursor-aware parallax hero.

describe("CursorDepthHero", () => {
  it("renders the section with data-slot='cursor-depth-hero'", () => {
    const { container } = render(
      <CursorDepthHero textSlot={<span>Text</span>} carouselSlot={<span>Carousel</span>} />,
    );
    expect(container.querySelector("[data-slot='cursor-depth-hero']")).not.toBeNull();
  });

  it("renders the textSlot in the text plane", () => {
    render(
      <CursorDepthHero
        textSlot={<p>hero copy</p>}
        carouselSlot={<span />}
      />,
    );
    expect(screen.getByText("hero copy")).toBeInTheDocument();
    expect(
      screen.getByText("hero copy").closest("[data-slot='cursor-depth-text']"),
    ).not.toBeNull();
  });

  it("renders the carouselSlot in the carousel plane", () => {
    render(
      <CursorDepthHero
        textSlot={<span />}
        carouselSlot={<p>carousel content</p>}
      />,
    );
    expect(screen.getByText("carousel content")).toBeInTheDocument();
    expect(
      screen.getByText("carousel content").closest(
        "[data-slot='cursor-depth-carousel']",
      ),
    ).not.toBeNull();
  });

  it("renders the decorative glow plane (aria-hidden)", () => {
    const { container } = render(
      <CursorDepthHero textSlot={<span />} carouselSlot={<span />} />,
    );
    const glow = container.querySelector("[aria-hidden='true']");
    expect(glow).not.toBeNull();
  });

  it("text plane and carousel plane are distinct siblings in the grid", () => {
    const { container } = render(
      <CursorDepthHero textSlot={<span />} carouselSlot={<span />} />,
    );
    const text = container.querySelector("[data-slot='cursor-depth-text']");
    const car = container.querySelector("[data-slot='cursor-depth-carousel']");
    expect(text).not.toBeNull();
    expect(car).not.toBeNull();
    expect(text?.parentElement).toBe(car?.parentElement);
  });
});
