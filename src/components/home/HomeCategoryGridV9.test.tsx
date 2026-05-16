import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

// cf-mu05 F1: pin priority-hint contract — exactly ONE image
// (index 0, the leftmost above-the-fold tile) carries priority. The
// other 3 cards in the grid must NOT carry priority — broadcasting
// priority across all 4 hurts LCP per web.dev guidance.

// Mock next/image so we can capture priority prop without rendering
// a real <img>. Spies on every call so order + count are observable.
const imageMock = vi.fn();
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    imageMock(props);
    return null;
  },
}));

import { HomeCategoryGridV9 } from "./HomeCategoryGridV9";

afterEach(() => {
  cleanup();
  imageMock.mockClear();
});

describe("HomeCategoryGridV9 — cf-mu05 F1 priority hint", () => {
  it("renders exactly 4 background category-card Image calls", () => {
    render(<HomeCategoryGridV9 />);
    // Filter for the category-photo Image renders (88px badges are also
    // Image, but they're not the priority candidates — distinguish by
    // sizes attr OR fill prop. The category photos use `fill`).
    const fillImages = imageMock.mock.calls
      .map((c) => c[0] as Record<string, unknown>)
      .filter((p) => p.fill === true && p.sizes !== "88px");
    expect(fillImages).toHaveLength(4);
  });

  it("applies priority=true to ONLY the first card (LCP candidate)", () => {
    render(<HomeCategoryGridV9 />);
    const fillImages = imageMock.mock.calls
      .map((c) => c[0] as Record<string, unknown>)
      .filter((p) => p.fill === true && p.sizes !== "88px");
    expect(fillImages[0]!.priority).toBe(true);
  });

  it("does NOT apply priority to cards 2-4 (below-LCP, would steal fetch budget)", () => {
    render(<HomeCategoryGridV9 />);
    const fillImages = imageMock.mock.calls
      .map((c) => c[0] as Record<string, unknown>)
      .filter((p) => p.fill === true && p.sizes !== "88px");
    expect(fillImages[1]!.priority).toBe(false);
    expect(fillImages[2]!.priority).toBe(false);
    expect(fillImages[3]!.priority).toBe(false);
  });

  it("preserves sizes attr on every card (responsive image contract)", () => {
    render(<HomeCategoryGridV9 />);
    const fillImages = imageMock.mock.calls
      .map((c) => c[0] as Record<string, unknown>)
      .filter((p) => p.fill === true && p.sizes !== "88px");
    for (const props of fillImages) {
      expect(props.sizes).toBe(
        "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw",
      );
    }
  });
});
