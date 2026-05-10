import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import AdminLoading from "@/app/admin/loading";

// cfw-zwm: Next renders /admin/loading during async resolution of any
// /admin/* page. The skeleton replaces the page body while the layout
// shell (cfw-wef header) stays visible. Tests pin the a11y attrs +
// presence of the shape blocks Brenda will see.

describe("/admin/loading", () => {
  it("flags the loading region with aria-busy + aria-live=polite", () => {
    render(<AdminLoading />);
    const region = screen.getByTestId("admin-loading");
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("renders 6 skeleton rows for the body block", () => {
    const { container } = render(<AdminLoading />);
    const rows = container.querySelector('[data-slot="admin-loading-rows"]')
      ?.children;
    expect(rows?.length).toBe(6);
  });

  it("renders a filter-row stand-in (matches /admin/audit + /admin/site-content top-of-page forms)", () => {
    const { container } = render(<AdminLoading />);
    // Three skeleton blocks live inside the filter row container.
    const filterRow = container.querySelector(".bg-cf-cream\\/40");
    expect(filterRow).not.toBeNull();
    expect(filterRow?.children.length).toBe(3);
  });
});
