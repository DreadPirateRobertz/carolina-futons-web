import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import AboutPage from "@/app/about/page";

// cf-about-timeline: visual milestones ground the "family-owned since 1991"
// claim in concrete dates. Assertions target the year labels only — descriptions
// can be copy-edited without test churn. Years are the load-bearing part.
describe("AboutPage timeline", () => {
  it("renders all four milestone years", () => {
    render(<AboutPage />);
    const section = screen.getByTestId("about-timeline");
    expect(section).toBeTruthy();
    for (const year of ["1991", "2000", "2010", "2024"]) {
      const el = screen.getByTestId(`about-timeline-year-${year}`);
      expect(el.textContent).toContain(year);
    }
  });
});
