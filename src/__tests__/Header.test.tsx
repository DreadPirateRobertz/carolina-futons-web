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
    // cf-jo07: both the site header and the mobile-drawer header carry the
    // "Carolina Futons — home" brand link now, so getByRole would throw on
    // multiple matches. Assert at least one match and that the first (the
    // site-header link) targets root.
    renderHeader();
    const homes = screen.getAllByRole("link", {
      name: /carolina futons.*home/i,
    });
    expect(homes.length).toBeGreaterThan(0);
    expect(homes[0]).toHaveAttribute("href", "/");
  });

  it("renders the CF logo + wordmark lockup in the brand link (cf-jo07)", () => {
    // cf-jo07: Stilgar restored the inline brand mark alongside the wordmark
    // (visible in both full and shrunken header states). The bear treatment
    // continues to live in the separate `header-bear-backdrop` slot. A
    // future drive-by that drops the inline logo would break unscrolled
    // brand recognition; assertion guards against it. alt="" is intentional
    // — the link's aria-label already names the destination.
    renderHeader();
    // cf-jo07: site-header + mobile drawer both render the brand link.
    // Pin the first match (site header) for the lockup assertion.
    const [home] = screen.getAllByRole("link", {
      name: /carolina futons.*home/i,
    });
    const img = home.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src") ?? "").toMatch(/cf-logo/);
    expect(img?.getAttribute("alt")).toBe("");
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

  it("renders the v9 hero copy on / (cf-1eb5 r3: 'Handcrafted Comfort, Mountain Inspired.')", () => {
    // Stilgar rejection #2 required the EXACT v9 mock-hero copy from
    // /Users/hal/gt/cfutons/crew/melania/design-vision/DESIGN-VISION.html
    // (the canonical v9 spec — supersedes the cf-3qt internal proposal).
    // Test pins headline, subline, and CTA label so a future drift fails
    // CI loudly.
    renderHeader();
    // Headline is split across a <br>; query each phrase.
    expect(screen.getByText(/handcrafted comfort,/i)).toBeInTheDocument();
    expect(screen.getByText(/mountain inspired\./i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /premium futons and furniture from the blue ridge mountains of north carolina/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /shop collection/i }),
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
      ["Murphy Cabinet Beds", "/shop/murphy-cabinet-beds"],
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
