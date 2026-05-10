import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

// cf-1eb5 r2: Header now reads usePathname() to gate the home-only hero band
// (v9 "Sleep on it for fifteen years." copy on / only). Default to "/" so
// the broad render-suite picks up the hero band; specific non-home cases
// override via vi.mocked(...) below.
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

import { Header } from "@/components/site/Header";
import { CartProvider } from "@/components/cart/CartProvider";

function renderHeader() {
  return render(
    <CartProvider>
      <Header />
    </CartProvider>,
  );
}

function renderHeaderWithSlot(announcementBar: ReactNode) {
  return render(
    <CartProvider>
      <Header announcementBar={announcementBar} />
    </CartProvider>,
  );
}

describe("Header (cf-3qt.1 Phase 1)", () => {
  it("renders the brand wordmark linked to /", () => {
    renderHeader();
    const home = screen.getByRole("link", { name: /carolina futons.*home/i });
    expect(home).toHaveAttribute("href", "/");
  });

  it("renders the wordmark inside the brand link (cf-1eb5: no logo medallion)", () => {
    // cf-1eb5 / cfw-v9: Stilgar rejected the medallion logo in favor of a
    // full-header bear illustration treatment. The brand link is now text
    // only — illustration lives in a separate `header-bear-backdrop` slot
    // behind the chrome. A future drive-by to "add the logo back inline"
    // would re-introduce the rejected lockup, so this guards against it.
    renderHeader();
    const home = screen.getByRole("link", { name: /carolina futons.*home/i });
    expect(home.querySelector("img")).toBeNull();
    expect(home.textContent).toContain("Carolina Futons");
  });

  it("renders a decorative bear illustration backdrop in the header (cf-1eb5)", () => {
    // cf-1eb5: v9 full-header treatment renders bears.jpg as a hero-scale
    // backdrop behind the chrome (announce + nav + sub-nav). The image is
    // marked aria-hidden + alt="" so screen readers don't double-announce
    // brand context already covered by the wordmark link.
    const { container } = renderHeader();
    const backdrop = container.querySelector('[data-slot="header-bear-backdrop"]');
    expect(backdrop).not.toBeNull();
    const img = backdrop!.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src") ?? "").toMatch(/bears/);
    expect(img?.getAttribute("alt")).toBe("");
  });

  it("renders the v9 hero copy on / (cf-1eb5 r2: 'Sleep on it for fifteen years.')", () => {
    // Stilgar rejection #2 required the EXACT mock-hero copy from
    // design-vision-cf-3qt.html. Test pins both the headline and the
    // mock-sub paragraph so a future drift to lorem-style placeholder
    // copy fails CI loudly.
    renderHeader();
    expect(
      screen.getByText(/sleep on it for/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/fifteen years\./i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /handcrafted in hendersonville, north carolina since 1991/i,
      ),
    ).toBeInTheDocument();
  });

  it("renders the primary nav with shop destinations", () => {
    renderHeader();
    // Two "Primary" navs exist: desktop (hidden md:flex) + mobile drawer
    const navs = screen.getAllByRole("navigation", { name: /primary/i });
    expect(navs.length).toBeGreaterThanOrEqual(1);
    const expected = [
      // cfw-3ty: hamburger label changed per Brenda's PDF; mobile drawer is
      // what RTL queries see (desktop nav is rendered as buttons, not links).
      ["Futon Frames", "/shop/futon-frames"],
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
    // cf-3qt.5.4: search is now a link to /search, not a placeholder button.
    const searchLink = screen.getByRole("link", { name: /search/i });
    expect(searchLink).toBeInTheDocument();
    expect(searchLink.getAttribute("href")).toBe("/search");
    expect(screen.getByRole("link", { name: /account/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cart/i })).toBeInTheDocument();
  });

  it("renders the announcement bar region", () => {
    renderHeader();
    expect(
      screen.getByRole("region", { name: /site announcement/i })
    ).toBeInTheDocument();
  });

  it("header does not have overflow-hidden", () => {
    const { container } = renderHeader();
    const header = container.querySelector('header[data-slot="site-header"]');
    expect(header).not.toBeNull();
    expect(header?.className).not.toContain("overflow-hidden");
  });

  it("renders the Browse CTA link to /shop", () => {
    renderHeader();
    const browse = screen.getByRole("link", { name: /browse/i });
    expect(browse).toHaveAttribute("href", "/shop");
  });

  // cfw-61b: announcementBar slot prop. layout.tsx (server) constructs an
  // AnnouncementBarCartAware with SiteContent-fed rotation copy and passes
  // it in via this prop; tests with no prop (the existing pattern above)
  // continue to render the default mount, which is what every existing
  // Header assertion relies on.
  it("renders an externally-supplied announcementBar in place of the default mount (cfw-61b)", () => {
    renderHeaderWithSlot(
      <div data-slot="custom-announcement-bar">
        Memorial Day — 15% off frames
      </div>,
    );
    const custom = document.querySelector(
      "[data-slot='custom-announcement-bar']",
    );
    expect(custom).not.toBeNull();
    expect(custom?.textContent).toContain("Memorial Day — 15% off frames");
  });

  it("falls back to the default AnnouncementBarCartAware mount when no slot is supplied (cfw-61b)", () => {
    renderHeader();
    // The default mount renders the AnnouncementBar region; if the slot
    // contract regressed (e.g. always rendered the prop, even undefined),
    // the announcement region would disappear and existing pages would
    // lose their delivery prompt.
    expect(
      screen.getByRole("region", { name: /site announcement/i }),
    ).toBeInTheDocument();
  });

});
