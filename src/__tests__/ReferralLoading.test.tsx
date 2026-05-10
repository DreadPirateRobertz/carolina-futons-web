import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import ReferralLoading from "@/app/referral/loading";

// cfw-v66: referral loading skeleton during parallel referral-code +
// stats fetch.

describe("/referral/loading", () => {
  it("flags the loading region with aria-busy + aria-live=polite", () => {
    render(<ReferralLoading />);
    const region = screen.getByTestId("referral-loading");
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("renders a share-link block with URL + Copy-button stand-ins", () => {
    const { container } = render(<ReferralLoading />);
    const share = container.querySelector(
      '[data-slot="referral-loading-share"]',
    );
    expect(share).not.toBeNull();
    expect(share?.children.length).toBe(2);
  });

  it("renders 3 stat-card placeholders matching the real ReferralDashboard stats grid", () => {
    const { container } = render(<ReferralLoading />);
    const stats = container.querySelector(
      '[data-slot="referral-loading-stats"]',
    );
    expect(stats).not.toBeNull();
    expect(stats?.children.length).toBe(3);
    expect(stats?.className).toMatch(/sm:grid-cols-3/);
  });
});
