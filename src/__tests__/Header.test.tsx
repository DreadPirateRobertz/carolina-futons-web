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

  it("renders the logo + wordmark lockup in the brand link", () => {
    renderHeader();
    const home = screen.getByRole("link", { name: /carolina futons.*home/i });
    const img = home.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src") ?? "").toMatch(/cf-logo-square/);
    expect(home.textContent).toContain("Carolina Futons");
  });

  it("marks the brand-lockup image as decorative (alt='') to avoid duplicate SR announcement", () => {
    // The parent link's aria-label already names the destination ("Carolina
    // Futons — home"); a non-empty alt would make a screen reader speak the
    // brand name twice. Locking alt="" here is a regression guard: a future
    // "fix the empty alt" drive-by would break this assertion loudly.
    renderHeader();
    const home = screen.getByRole("link", { name: /carolina futons.*home/i });
    const img = home.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("alt")).toBe("");
  });

  it("renders the primary nav with shop destinations", () => {
    renderHeader();
    // Two "Primary" navs exist: desktop (hidden md:flex) + mobile drawer
    const navs = screen.getAllByRole("navigation", { name: /primary/i });
    expect(navs.length).toBeGreaterThanOrEqual(1);
    const nav = navs[0];
    const expected = [
      ["Futons", "/shop/futon-frames"],
      ["Murphy Beds", "/shop/murphy-cabinet-beds"],
      ["Platform Beds", "/shop/platform-beds"],
      ["Mattresses", "/shop/mattresses"],
      ["Sale", "/shop/mattresses-sale"],
    ] as const;
    expected.forEach(([label, href]) => {
      // Use getAllByRole because links exist in both desktop nav and mobile drawer
      const links = screen.getAllByRole("link", { name: label });
      expect(links.length).toBeGreaterThanOrEqual(1);
      expect(links[0]).toHaveAttribute("href", href);
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
