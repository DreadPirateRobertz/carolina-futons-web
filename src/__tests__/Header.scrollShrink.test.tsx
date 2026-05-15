import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";

// cf-h85f: pin pathname so usePathname() returns "/" — the home-only hero
// band only renders when isHome is true. Without this mock the scroll
// tests for the hero-band collapse can't find the element (next/navigation
// returns null in vitest's jsdom env without an app-router context).
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

import { Header } from "@/components/site/Header";
import { CartProvider } from "@/components/cart/CartProvider";

vi.mock("@/components/home/LivingHero", () => ({
  LivingHero: () => <div data-slot="living-hero" />,
}));

// Mock useReducedMotion so the reduced-motion branch is deterministically
// exercisable. All other framer-motion exports stay live.
vi.mock("framer-motion", async () => {
  const actual =
    await vi.importActual<typeof import("framer-motion")>("framer-motion");
  return { ...actual, useReducedMotion: vi.fn() };
});

const { useReducedMotion } = await import("framer-motion");
const mockedReducedMotion = vi.mocked(useReducedMotion);

function setScroll(y: number) {
  Object.defineProperty(window, "scrollY", {
    value: y,
    writable: true,
    configurable: true,
  });
  window.dispatchEvent(new Event("scroll"));
}

function renderHeader() {
  return render(
    <CartProvider>
      <Header />
    </CartProvider>,
  );
}

beforeEach(() => {
  mockedReducedMotion.mockReturnValue(false);
  setScroll(0);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Header — scroll shrink (cf-nav-scroll-shrink)", () => {
  it("starts with data-scrolled='false' and no shadow-md on the header", () => {
    const { container } = renderHeader();
    const header = container.querySelector("[data-slot='site-header']");
    expect(header).not.toBeNull();
    expect(header!.getAttribute("data-scrolled")).toBe("false");
    expect(header!.className).not.toMatch(/\bshadow-md\b/);
  });

  it("sets data-scrolled='true' + shadow-md when window.scrollY passes 80px", async () => {
    const { container } = renderHeader();
    await act(async () => {
      setScroll(120);
    });
    const header = container.querySelector("[data-slot='site-header']");
    expect(header!.getAttribute("data-scrolled")).toBe("true");
    expect(header!.className).toMatch(/\bshadow-md\b/);
  });

  it("compresses the main-row padding from py-4 → py-2 on scroll (non-reduced-motion)", async () => {
    const { container } = renderHeader();
    const mainRow = container.querySelector("[data-slot='site-header-main']");
    expect(mainRow).not.toBeNull();
    expect(mainRow!.className).toMatch(/\bpy-4\b/);
    await act(async () => {
      setScroll(200);
    });
    expect(mainRow!.className).toMatch(/\bpy-2\b/);
    expect(mainRow!.className).not.toMatch(/\bpy-4\b/);
  });

  it("keeps py-4 under reduced-motion even when scrolled, but still applies shadow-md", async () => {
    // Vestibular-safe: shadow is not a motion trigger (safe to toggle); the
    // height shrink IS a reflow — suppress it so the chrome stays static
    // under prefers-reduced-motion.
    mockedReducedMotion.mockReturnValue(true);
    const { container } = renderHeader();
    await act(async () => {
      setScroll(300);
    });
    const header = container.querySelector("[data-slot='site-header']");
    const mainRow = container.querySelector("[data-slot='site-header-main']");
    expect(header!.className).toMatch(/\bshadow-md\b/);
    expect(mainRow!.className).toMatch(/\bpy-4\b/);
    expect(mainRow!.className).not.toMatch(/\bpy-2\b/);
  });

  it("exposes a shadow transition so the scrolled-in shadow fades in smoothly", () => {
    const { container } = renderHeader();
    const header = container.querySelector("[data-slot='site-header']");
    expect(header!.className).toMatch(/transition-shadow/);
  });

  // cf-jo07 r2: Stilgar reversed cf-h85f's bear-fade + bg-white swap.
  // The bear backdrop now stays opacity-100 in BOTH states (Stilgar wants
  // shrunken state to read as bear chrome, not a plain white bar) and
  // the header surface stays transparent (the top gradient on the
  // backdrop already provides legibility). The home hero band still
  // collapses to max-h-0 — that's the actual scroll-shrink — so its
  // pin survives.
  it("keeps the bear backdrop visible (opacity-100) in both states (cf-jo07 r2)", () => {
    const { container } = renderHeader();
    expect(
      container
        .querySelector('[data-slot="header-bear-backdrop"]')!
        .className,
    ).toMatch(/\bopacity-100\b/);
    act(() => {
      setScroll(120);
    });
    expect(
      container
        .querySelector('[data-slot="header-bear-backdrop"]')!
        .className,
    ).toMatch(/\bopacity-100\b/);
  });

  it("collapses the home hero band to max-h-0 + opacity-0 once scrolled (cf-h85f)", () => {
    const { container } = renderHeader();
    const heroBefore = container.querySelector(
      '[data-testid="site-header-hero"]',
    );
    expect(heroBefore).not.toBeNull();
    expect(heroBefore!.className).not.toMatch(/\bmax-h-0\b/);
    expect(heroBefore!.getAttribute("aria-hidden")).toBeNull();
    act(() => {
      setScroll(120);
    });
    const heroAfter = container.querySelector(
      '[data-testid="site-header-hero"]',
    );
    expect(heroAfter!.className).toMatch(/\bmax-h-0\b/);
    expect(heroAfter!.className).toMatch(/\bopacity-0\b/);
    expect(heroAfter!.getAttribute("aria-hidden")).toBe("true");
  });

  it("never swaps the header surface to bg-white on scroll (cf-jo07 r2)", () => {
    const { container } = renderHeader();
    expect(
      container.querySelector("[data-slot='site-header']")!.className,
    ).not.toMatch(/\bbg-white\b/);
    act(() => {
      setScroll(120);
    });
    expect(
      container.querySelector("[data-slot='site-header']")!.className,
    ).not.toMatch(/\bbg-white\b/);
  });
});
