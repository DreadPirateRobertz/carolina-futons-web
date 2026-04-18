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
    // Backdrop has aria-hidden="true" and the bg-cf-charcoal/40 class
    const backdrop = container.querySelector('[aria-hidden="true"]');
    expect(backdrop).not.toBeNull();
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
});
