// cfw-vtx: /admin landing — replaces the cfw-wef placeholder copy with
// a real nav surface listing the owner-mode tools shipped under cfw-6qd.
// Auth gate is covered by AdminLayout.test.tsx (cfw-wef); here we only
// pin the presentation.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import AdminHomePage from "@/app/admin/page";

describe("AdminHomePage (cfw-vtx)", () => {
  it("renders the Owner mode heading", () => {
    render(<AdminHomePage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /owner mode/i }),
    ).toBeInTheDocument();
  });

  it("links to the Browse SiteContent surface", () => {
    render(<AdminHomePage />);
    const link = screen.getByRole("link", { name: /browse sitecontent/i });
    expect(link).toHaveAttribute("href", "/admin/site-content");
  });

  it("renders the storefront-affordances section (inline pencils + image replace)", () => {
    render(<AdminHomePage />);
    const onSite = screen.getByTestId("admin-home-on-site");
    expect(onSite).toBeInTheDocument();
    expect(
      screen.getByText(/inline pencils on copy/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/inline image replace/i)).toBeInTheDocument();
  });

  it("links back to the storefront", () => {
    render(<AdminHomePage />);
    const back = screen.getByRole("link", { name: /back to the storefront/i });
    expect(back).toHaveAttribute("href", "/");
  });

  it("does NOT render the legacy 'up next' placeholder copy", () => {
    render(<AdminHomePage />);
    // The original cfw-wef copy framed several sub-beads as 'up next'.
    // Once one of the listed sub-beads ships, that copy is misleading —
    // catch a regression that re-introduces it.
    expect(screen.queryByText(/up next \(cfw-6qd/i)).not.toBeInTheDocument();
  });
});
