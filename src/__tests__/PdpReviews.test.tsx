import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { PdpReviews } from "@/components/product/PdpReviews";

vi.mock("@/lib/product/review-stats", async (importActual) => {
  const actual =
    await importActual<typeof import("@/lib/product/review-stats")>();
  return {
    ...actual,
    getReviewStats: vi.fn(actual.getReviewStats),
  };
});
import * as reviewStats from "@/lib/product/review-stats";

describe("PdpReviews", () => {
  it("renders aggregate rating + count from getReviewStats SEED for known slug", () => {
    render(<PdpReviews productName="Monterey Futon" productSlug="monterey-futon" />);

    expect(
      screen.getByRole("heading", { name: /customer reviews/i }),
    ).toBeTruthy();
    expect(screen.getByText("4.9")).toBeTruthy();
    expect(screen.getByText(/\(42 reviews\)/)).toBeTruthy();
  });

  it("uses 'review' singular when count is 1", () => {
    vi.mocked(reviewStats.getReviewStats).mockReturnValueOnce({
      rating: 5,
      count: 1,
    });
    render(<PdpReviews productName="Solo" productSlug="some-slug" />);
    expect(screen.getByText(/\(1 review\)/)).toBeTruthy();
    expect(screen.queryByText(/\(1 reviews\)/)).toBeNull();
  });

  it("suppresses the aggregate paragraph when getReviewStats returns null", () => {
    vi.mocked(reviewStats.getReviewStats).mockReturnValueOnce(null);
    const { container } = render(
      <PdpReviews productName="Anything" productSlug="any-slug" />,
    );
    expect(
      container.querySelector('[data-slot="pdp-reviews-aggregate"]'),
    ).toBeNull();
    // Section heading still renders even without stats
    expect(
      screen.getByRole("heading", { name: /customer reviews/i }),
    ).toBeTruthy();
  });

  it("falls back to murphy-beds reviews when slug contains the 'murphy' token", () => {
    render(
      <PdpReviews productName="Unrelated Name" productSlug="murphy-cabinet-bed" />,
    );

    expect(
      screen.getByRole("heading", { name: /saved our tiny guest room/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        name: /carolina futons earned our second trip/i,
      }),
    ).toBeTruthy();
  });

  it("falls back to mattresses reviews when slug contains the 'mattress' token", () => {
    render(
      <PdpReviews
        productName="Generic Bedding Item"
        productSlug="classic-8-inch-mattress"
      />,
    );
    // Both seeded mattress-category reviews appear.
    expect(
      screen.getByRole("heading", { name: /comfortable for sitting/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: /real wool, real difference/i }),
    ).toBeTruthy();
  });

  it("falls back to frames reviews on slugs with 'frame', 'futon', or 'daybed' tokens", () => {
    for (const slug of [
      "hardwood-bed-frame",
      "monterey-futon",
      "craftsman-daybed",
    ]) {
      const { unmount } = render(
        <PdpReviews productName="Unrelated Name For Fallback" productSlug={slug} />,
      );
      // Solid hardwood is the seeded frames review with the most distinctive title.
      expect(
        screen.getByRole("heading", { name: /built to last/i }),
      ).toBeTruthy();
      unmount();
    }
  });

  it("token match blocks substring collisions — 'frameworks-comparison' must not pull frames reviews", () => {
    // The old `s.includes("frame")` substring check would match any slug
    // with "frame" as a substring (frameworks, subframe, etc). Token-based
    // mapping requires "frame"/"futon"/"daybed" to appear as their own
    // `-`-delimited tokens.
    render(
      <PdpReviews
        productName="Frameworks Comparison Guide"
        productSlug="frameworks-comparison-guide"
      />,
    );
    expect(
      screen.queryByRole("heading", { name: /built to last/i }),
    ).toBeNull();
    expect(screen.getByText(/be the first to share your story/i)).toBeTruthy();
  });

  it("murphy-bed-frame routes to murphy-beds, not frames (precedence)", () => {
    // Critical ordering invariant: a Murphy product whose slug also contains
    // a frame token must NOT be miscategorized as frames.
    render(
      <PdpReviews
        productName="Unrelated Name"
        productSlug="murphy-bed-frame"
      />,
    );
    // Murphy review present
    expect(
      screen.getByRole("heading", { name: /saved our tiny guest room/i }),
    ).toBeTruthy();
    // Frames-only review absent
    expect(
      screen.queryByRole("heading", { name: /built to last/i }),
    ).toBeNull();
  });

  it("prefers exact productName match over category fallback", () => {
    render(
      <PdpReviews
        productName="Highland Wool Mattress"
        productSlug="highland-wool-mattress"
      />,
    );

    expect(
      screen.getByRole("heading", { name: /real wool, real difference/i }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: /comfortable for sitting/i }),
    ).toBeNull();
  });

  it("matches productName case-insensitively and trims trailing whitespace", () => {
    render(
      <PdpReviews
        productName="  HIGHLAND WOOL MATTRESS  "
        productSlug="highland-wool-mattress"
      />,
    );
    expect(
      screen.getByRole("heading", { name: /real wool, real difference/i }),
    ).toBeTruthy();
  });

  it("caps the review list at the limit prop", () => {
    render(
      <PdpReviews
        productName="Unmatched"
        productSlug="generic-mattress"
        limit={1}
      />,
    );
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(1);
  });

  it("renders the empty state with /reviews link when no productName or category match", () => {
    render(<PdpReviews productName="Mystery Item" productSlug="abstract-decor" />);
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    expect(screen.getByText(/be the first to share your story/i)).toBeTruthy();

    const links = screen
      .getAllByRole("link")
      .filter((l) => l.getAttribute("href") === "/reviews");
    expect(links.length).toBeGreaterThanOrEqual(2);
  });

  it("labels the section via aria-labelledby and exposes the heading", () => {
    render(<PdpReviews productName="Anything" productSlug="monterey-futon" />);
    const region = screen.getByRole("region", { name: /customer reviews/i });
    expect(region).toBeTruthy();
  });

  it("aggregate row exposes a single composite aria-label (no duplicated reading of the rating)", () => {
    render(<PdpReviews productName="Anything" productSlug="monterey-futon" />);
    // Composite label includes rating + count once. The inner glyphs / numbers
    // are aria-hidden so screen readers don't double-announce "4.9".
    const aggregate = screen.getByLabelText(
      /4\.9 out of 5 stars, 42 reviews/i,
    );
    expect(aggregate).toBeTruthy();
  });

  it("each review card exposes its own integer star aria-label", () => {
    render(<PdpReviews productName="Anything" productSlug="monterey-futon" />);
    const articles = screen.getAllByRole("article");
    for (const article of articles) {
      const label = within(article).getByLabelText(/\d out of 5 stars/);
      expect(label).toBeTruthy();
    }
  });
});
