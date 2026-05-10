import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import CompareLoading from "@/app/compare/loading";

// cfw-gr4: compare loading skeleton during parallel getProductBySlug.

describe("/compare/loading", () => {
  it("flags the loading region with aria-busy + aria-live=polite", () => {
    render(<CompareLoading />);
    const region = screen.getByTestId("compare-loading");
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("renders 4 column placeholders matching COMPARE_MAX product slots", () => {
    const { container } = render(<CompareLoading />);
    const header = container.querySelector(
      '[data-slot="compare-loading-header"]',
    );
    expect(header).not.toBeNull();
    expect(header?.children.length).toBe(4);
  });

  it("renders 8 attribute-row skeletons (matches the typical CompareTable row count)", () => {
    const { container } = render(<CompareLoading />);
    const rows = container.querySelectorAll(
      '[data-slot="compare-loading-row"]',
    );
    expect(rows.length).toBe(8);
  });
});
