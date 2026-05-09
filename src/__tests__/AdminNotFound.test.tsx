import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";

import AdminNotFound from "@/app/admin/not-found";

// cfw-pxi: admin-themed 404. Tests pin the four owner-relevant
// destinations the page offers — without these, Next.js falls through
// to the global src/app/not-found.tsx which links to /shop instead.

describe("/admin/not-found", () => {
  it("renders a 404 heading", () => {
    render(<AdminNotFound />);
    expect(
      screen.getByRole("heading", { level: 1, name: /admin page.*doesn.t exist/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("links to /admin (owner home)", () => {
    render(<AdminNotFound />);
    const list = screen.getByTestId("admin-not-found-links");
    const link = within(list).getByRole("link", { name: /owner home/i });
    expect(link).toHaveAttribute("href", "/admin");
  });

  it("links to /admin/site-content", () => {
    render(<AdminNotFound />);
    const list = screen.getByTestId("admin-not-found-links");
    const link = within(list).getByRole("link", { name: /browse sitecontent/i });
    expect(link).toHaveAttribute("href", "/admin/site-content");
  });

  it("links to /admin/audit", () => {
    render(<AdminNotFound />);
    const list = screen.getByTestId("admin-not-found-links");
    const link = within(list).getByRole("link", { name: /audit log/i });
    expect(link).toHaveAttribute("href", "/admin/audit");
  });

  it("links back to the storefront", () => {
    render(<AdminNotFound />);
    const list = screen.getByTestId("admin-not-found-links");
    const link = within(list).getByRole("link", {
      name: /back to the storefront/i,
    });
    expect(link).toHaveAttribute("href", "/");
  });

  it("does NOT link to /shop (the global not-found's first CTA)", () => {
    render(<AdminNotFound />);
    expect(screen.queryByRole("link", { name: /browse the shop/i })).toBeNull();
  });
});
