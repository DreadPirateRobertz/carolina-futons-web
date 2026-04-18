import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { StatsStrip, STATS } from "@/components/site/StatsStrip";

// Home-page stats strip (3 bold numbers: years in business, happy customers,
// warranty). Pinned contract: value text renders verbatim, labels render,
// and the surface is a labelled region for landmark navigation.

describe("StatsStrip", () => {
  it("renders exactly three stats", () => {
    render(<StatsStrip />);
    expect(screen.getAllByTestId("stat")).toHaveLength(3);
  });

  it("renders each stat's value and label verbatim", () => {
    render(<StatsStrip />);
    const cards = screen.getAllByTestId("stat");
    expect(STATS).toHaveLength(3);
    STATS.forEach((stat, i) => {
      expect(within(cards[i]!).getByText(stat.value)).toBeInTheDocument();
      expect(within(cards[i]!).getByText(stat.label)).toBeInTheDocument();
    });
  });

  it("renders the expected CF-voice copy", () => {
    render(<StatsStrip />);
    // Melania spec: '35+ years in business | 1,000+ happy customers |
    // 15-year frame warranty'. Lock the exact copy so marketing doesn't
    // silently drift a number without a bead.
    expect(screen.getByText("35+")).toBeInTheDocument();
    expect(screen.getByText(/years in business/i)).toBeInTheDocument();
    expect(screen.getByText("1,000+")).toBeInTheDocument();
    expect(screen.getByText(/happy customers/i)).toBeInTheDocument();
    expect(screen.getByText("15-year")).toBeInTheDocument();
    expect(screen.getByText(/frame warranty/i)).toBeInTheDocument();
  });

  it("exposes the section as a labelled region for landmark navigation", () => {
    render(<StatsStrip />);
    expect(
      screen.getByRole("region", { name: /by the numbers/i }),
    ).toBeInTheDocument();
  });
});
