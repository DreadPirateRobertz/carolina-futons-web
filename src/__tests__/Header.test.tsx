import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Header } from "@/components/site/Header";
import { CartProvider } from "@/components/cart/CartProvider";

function renderHeader() {
  return render(
    <CartProvider>
      <Header />
    </CartProvider>,
  );
}

describe("Header (cf-3qt.1 Phase 1)", () => {
  it("renders the brand wordmark linked to /", () => {
    renderHeader();
    const home = screen.getByRole("link", { name: /carolina futons.*home/i });
    expect(home).toHaveAttribute("href", "/");
  });

  it("renders the primary nav with shop destinations", () => {
    renderHeader();
    const nav = screen.getByRole("navigation", { name: /primary/i });
    expect(nav).toBeInTheDocument();
    ["Futons", "Murphy Beds", "Mattresses", "Frames", "Sale"].forEach((label) => {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    });
  });

  it("renders the sub-nav with resource links", () => {
    renderHeader();
    const nav = screen.getByRole("navigation", { name: /secondary/i });
    expect(nav).toBeInTheDocument();
  });

  it("exposes search, account, and cart actions with accessible labels", () => {
    renderHeader();
    expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /account/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cart/i })).toBeInTheDocument();
  });

  it("renders the announcement bar region", () => {
    renderHeader();
    expect(
      screen.getByRole("region", { name: /site announcement/i })
    ).toBeInTheDocument();
  });

  it("applies h-cf-header token so the 213px chrome spec is honored", () => {
    const { container } = renderHeader();
    const header = container.querySelector('header[data-slot="site-header"]');
    expect(header).not.toBeNull();
    expect(header?.className).toContain("h-cf-header");
  });
});
