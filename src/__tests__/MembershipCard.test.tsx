import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MembershipCard } from "@/components/member/MembershipCard";

const successData = {
  success: true as const,
  currentTierName: "Trail Blazer",
  currentTierKey: "trail_blazer",
  totalPoints: 350,
  unlockedPerks: [
    { tierKey: "trail_blazer", tierName: "Trail Blazer", perkId: "p1", label: "10% off accessories", description: "Desc", icon: "🎁" },
    { tierKey: "trail_blazer", tierName: "Trail Blazer", perkId: "p2", label: "Early sale access", description: "Desc", icon: "⚡" },
  ],
  nextTierName: "Mountain Guide",
  nextTierKey: "mountain_guide",
  nextTierPointsNeeded: 750,
  nextTierPerks: [],
};

describe("MembershipCard", () => {
  it("renders current tier name and total points", () => {
    render(<MembershipCard data={successData} />);
    expect(screen.getByText("Trail Blazer")).toBeTruthy();
    expect(screen.getByText("350")).toBeTruthy();
    expect(screen.getByText("points")).toBeTruthy();
  });

  it("shows progress bar toward next tier", () => {
    render(<MembershipCard data={successData} />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-label")).toContain("Mountain Guide");
    expect(screen.getByText(/400 pts to Mountain Guide/i)).toBeTruthy();
  });

  it("renders unlocked perks list", () => {
    render(<MembershipCard data={successData} />);
    expect(screen.getByText("10% off accessories")).toBeTruthy();
    expect(screen.getByText("Early sale access")).toBeTruthy();
  });

  it("caps perk list at 3 and shows overflow count", () => {
    const manyPerks = {
      ...successData,
      unlockedPerks: Array.from({ length: 5 }, (_, i) => ({
        tierKey: "t",
        tierName: "T",
        perkId: `p${i}`,
        label: `Perk ${i}`,
        description: "",
        icon: "•",
      })),
    };
    render(<MembershipCard data={manyPerks} />);
    expect(screen.getByText(/\+2 more perks unlocked/i)).toBeTruthy();
  });

  it("renders no progress bar when at max tier (nextTierName null)", () => {
    const maxTier = {
      ...successData,
      nextTierName: null,
      nextTierKey: null,
      nextTierPointsNeeded: null,
      nextTierPerks: null,
    };
    render(<MembershipCard data={maxTier} />);
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("shows error state when success=false", () => {
    render(<MembershipCard data={{ success: false, error: "fetch_failed" }} />);
    expect(screen.getByText(/could not load membership data/i)).toBeTruthy();
  });
});
