import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import GiftCardsLoading from "@/app/gift-cards/loading";

// cfw-vbj: gift-cards loading skeleton during async listGiftCards.

describe("/gift-cards/loading", () => {
  it("flags the loading region with aria-busy + aria-live=polite", () => {
    render(<GiftCardsLoading />);
    const region = screen.getByTestId("gift-cards-loading");
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("renders 6 picker-card skeletons in the grid", () => {
    const { container } = render(<GiftCardsLoading />);
    const grid = container.querySelector(
      '[data-slot="gift-cards-loading-picker"]',
    );
    expect(grid).not.toBeNull();
    expect(grid?.children.length).toBe(6);
  });

  it("uses the 2/3-column grid matching the real GiftCardPicker layout", () => {
    const { container } = render(<GiftCardsLoading />);
    const grid = container.querySelector(
      '[data-slot="gift-cards-loading-picker"]',
    );
    expect(grid?.className).toMatch(/grid-cols-2/);
    expect(grid?.className).toMatch(/sm:grid-cols-3/);
  });
});
