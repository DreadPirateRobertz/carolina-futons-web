import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HeaderMobileMenu } from "@/components/site/HeaderMobileMenu";

function renderMenu() {
  return render(<HeaderMobileMenu />);
}

describe("HeaderMobileMenu", () => {
  afterEach(() => {
    // Ensure body overflow is reset between tests
    document.body.style.overflow = "";
  });

  // ── Hamburger trigger ──────────────────────────────────────────────────────

  it("renders the hamburger trigger button with accessible label", () => {
    renderMenu();
    expect(
      screen.getByRole("button", { name: /open navigation menu/i }),
    ).toBeInTheDocument();
  });

  it("hamburger button has aria-expanded=false when closed", () => {
    renderMenu();
    expect(
      screen.getByRole("button", { name: /open navigation menu/i }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  // ── Drawer closed state ────────────────────────────────────────────────────

  it("drawer is not visible when closed (translate-x-full)", () => {
    renderMenu();
    const drawer = document.getElementById("mobile-nav-drawer");
    expect(drawer).toHaveAttribute("data-state", "closed");
    expect(drawer?.className).toContain("-translate-x-full");
  });

  it("nav links are in the DOM even when closed", () => {
    renderMenu();
    expect(screen.getByRole("link", { name: "Futons" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mattresses" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Guides" })).toBeInTheDocument();
  });

  // ── Click to open ──────────────────────────────────────────────────────────

  it("clicking the hamburger opens the drawer", async () => {
    renderMenu();
    const trigger = screen.getByRole("button", { name: /open navigation menu/i });
    await userEvent.click(trigger);
    const drawer = document.getElementById("mobile-nav-drawer");
    expect(drawer).toHaveAttribute("data-state", "open");
    expect(drawer?.className).toContain("translate-x-0");
  });

  it("trigger aria-expanded becomes true when open", async () => {
    renderMenu();
    const trigger = screen.getByRole("button", { name: /open navigation menu/i });
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("trigger label changes to 'Close navigation menu' when open", async () => {
    renderMenu();
    await userEvent.click(
      screen.getByRole("button", { name: /open navigation menu/i }),
    );
    expect(
      screen.getAllByRole("button", { name: /close navigation menu/i })[0],
    ).toBeInTheDocument();
  });

  it("backdrop is rendered when open", async () => {
    const { container } = renderMenu();
    await userEvent.click(
      screen.getByRole("button", { name: /open navigation menu/i }),
    );
    // Backdrop is the fixed inset-0 div with aria-hidden="true". Visual
    // focus comes from a 70% charcoal tint plus a subtle blur so content
    // beneath is clearly de-emphasized rather than bleeding through.
    const backdrop = document.body.querySelector(
      'div[aria-hidden="true"].fixed.inset-0',
    );
    expect(backdrop).not.toBeNull();
    expect(backdrop?.className).toContain("bg-cf-charcoal/70");
    expect(backdrop?.className).toContain("backdrop-blur-sm");
    expect(container).toBeDefined();
  });

  it("drawer is comfortably wide on small phones (w-80) and tightens at sm:", () => {
    renderMenu();
    const drawer = document.getElementById("mobile-nav-drawer");
    // 320px on <640px viewports keeps content from peeking past the right
    // edge on iPhone-13/14-class screens; sm: trims back to 288px so the
    // tablet column doesn't feel chunky.
    expect(drawer?.className).toContain("w-80");
    expect(drawer?.className).toContain("sm:w-72");
  });

  it("locks body scroll when open", async () => {
    renderMenu();
    await userEvent.click(
      screen.getByRole("button", { name: /open navigation menu/i }),
    );
    expect(document.body.style.overflow).toBe("hidden");
  });

  // ── ESC to close ───────────────────────────────────────────────────────────

  it("pressing Escape closes the drawer", async () => {
    renderMenu();
    await userEvent.click(
      screen.getByRole("button", { name: /open navigation menu/i }),
    );
    fireEvent.keyDown(document, { key: "Escape" });
    const drawer = document.getElementById("mobile-nav-drawer");
    expect(drawer).toHaveAttribute("data-state", "closed");
  });

  it("unlocks body scroll after ESC close", async () => {
    renderMenu();
    await userEvent.click(
      screen.getByRole("button", { name: /open navigation menu/i }),
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.body.style.overflow).toBe("");
  });

  // ── Outside-click to close ─────────────────────────────────────────────────

  it("clicking outside the drawer closes it", async () => {
    renderMenu();
    await userEvent.click(
      screen.getByRole("button", { name: /open navigation menu/i }),
    );
    // Fire pointerdown on document body (outside the drawer)
    fireEvent.pointerDown(document.body);
    const drawer = document.getElementById("mobile-nav-drawer");
    expect(drawer).toHaveAttribute("data-state", "closed");
  });

  // ── In-drawer close button ─────────────────────────────────────────────────

  it("clicking the in-drawer close button closes the drawer", async () => {
    renderMenu();
    await userEvent.click(
      screen.getByRole("button", { name: /open navigation menu/i }),
    );
    const closeButtons = screen.getAllByRole("button", {
      name: /close navigation menu/i,
    });
    // Drawer's own close button is the last in DOM order (trigger comes first)
    await userEvent.click(closeButtons[closeButtons.length - 1]);
    const drawer = document.getElementById("mobile-nav-drawer");
    expect(drawer).toHaveAttribute("data-state", "closed");
  });

  // ── Nav link content ───────────────────────────────────────────────────────

  it("renders all primary nav links with correct hrefs", () => {
    renderMenu();
    const expected = [
      ["Futons", "/shop/futon-frames"],
      ["Murphy Beds", "/shop/murphy-cabinet-beds"],
      ["Platform Beds", "/shop/platform-beds"],
      ["Mattresses", "/shop/mattresses"],
      ["Sale", "/shop/mattresses-sale"],
    ] as const;
    expected.forEach(([label, href]) => {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute(
        "href",
        href,
      );
    });
  });

  it("renders all sub-nav links with correct hrefs", () => {
    renderMenu();
    const expected = [
      ["Design a Room", "/design-a-room"],
      ["Guides", "/guides"],
      ["Reviews", "/reviews"],
      ["Blog", "/blog"],
      ["About", "/about"],
      ["Visit Us", "/visit"],
      ["Contact", "/contact"],
    ] as const;
    expected.forEach(([label, href]) => {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute(
        "href",
        href,
      );
    });
  });

  it("surfaces Phase-2 content routes (/about, /blog, /contact) in the drawer", () => {
    renderMenu();
    // Compliance net: the mobile drawer must expose the three Phase-2
    // content pages so mobile traffic can reach them without relying on
    // the footer (which is below the fold on long pages).
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute(
      "href",
      "/about",
    );
    expect(screen.getByRole("link", { name: "Blog" })).toHaveAttribute(
      "href",
      "/blog",
    );
    expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute(
      "href",
      "/contact",
    );
  });

  // ── Accessibility ──────────────────────────────────────────────────────────

  it("drawer has role=dialog and aria-modal=true", () => {
    renderMenu();
    const drawer = document.getElementById("mobile-nav-drawer");
    expect(drawer).toHaveAttribute("role", "dialog");
    expect(drawer).toHaveAttribute("aria-modal", "true");
  });

  it("drawer has accessible name via aria-label", () => {
    renderMenu();
    expect(
      screen.getByRole("dialog", { name: /navigation menu/i }),
    ).toBeInTheDocument();
  });

  // ── Portal (cf-mobile-hamburger-portal — Stilgar P0) ───────────────────────

  it("portals the drawer to document.body so it escapes the Header stacking context", () => {
    const { container } = renderMenu();
    const drawer = screen.getByRole("dialog", { name: /navigation menu/i });
    // The drawer must NOT live inside the same React subtree as the
    // trigger — that's the whole point of the portal. The container
    // here is the test root that holds <HeaderMobileMenu />; if the
    // drawer were still inline it would be nested under that root.
    expect(container.contains(drawer)).toBe(false);
    // Drawer should land directly under <body>.
    expect(drawer.parentElement).toBe(document.body);
  });

  it("does not throw when there is no document on first render (mounted gate)", () => {
    // We can't easily simulate SSR here, but we can pin the visible
    // contract: the trigger renders even before the drawer's portal
    // mounts. The hook flips `mounted` in useEffect so by the time
    // testing-library inspects the DOM the drawer is portaled — the
    // crash mode would be a thrown error during render, which would
    // surface as render() rejecting.
    expect(() => renderMenu()).not.toThrow();
    expect(
      screen.getByRole("button", { name: /open navigation menu/i }),
    ).toBeInTheDocument();
  });
});
