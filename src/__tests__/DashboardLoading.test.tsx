import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import DashboardLoading from "@/app/(member)/dashboard/loading";

// cfw-tov: dashboard loading skeleton — covers /dashboard +
// /dashboard/orders + /dashboard/profile + /dashboard/wishlist +
// /dashboard/preferences via the route segment loading boundary.

describe("/(member)/dashboard/loading", () => {
  it("flags the loading region with aria-busy + aria-live=polite", () => {
    render(<DashboardLoading />);
    const region = screen.getByTestId("dashboard-loading");
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("renders 5 tab placeholders matching DASHBOARD_TABS count", () => {
    const { container } = render(<DashboardLoading />);
    const tabs = container.querySelector(
      '[data-slot="dashboard-loading-tabs"]',
    );
    expect(tabs).not.toBeNull();
    expect(tabs?.children.length).toBe(5);
  });

  it("renders 4 content-card placeholders in a 2-column body grid", () => {
    const { container } = render(<DashboardLoading />);
    const body = container.querySelector(
      '[data-slot="dashboard-loading-body"]',
    );
    expect(body).not.toBeNull();
    expect(body?.children.length).toBe(4);
    expect(body?.className).toMatch(/md:grid-cols-2/);
  });
});
