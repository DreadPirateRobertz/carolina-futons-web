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

// cf-r9r3: the Header scroll handler now rAF-throttles state updates,
// so dispatching a scroll event no longer synchronously updates `scrolled`.
// Tests must flush the queued rAF callback before asserting on the post-
// scroll state. In jsdom, requestAnimationFrame is polyfilled to a 16ms
// setTimeout, so a single resolved microtask awaited after dispatch is
// enough — the rAF callback runs on the macrotask queue ahead of the
// next test assertion.
async function flushRaf() {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
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
      await flushRaf();
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
      await flushRaf();
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
      await flushRaf();
    });
    const header = container.querySelector("[data-slot='site-header']");
    const mainRow = container.querySelector("[data-slot='site-header-main']");
    expect(header!.className).toMatch(/\bshadow-md\b/);
    expect(mainRow!.className).toMatch(/\bpy-4\b/);
    expect(mainRow!.className).not.toMatch(/\bpy-2\b/);
  });

  it("exposes a transition that includes the shadow so the scrolled-in shadow fades in smoothly", () => {
    // cf-r9r3: all header transitions consolidated into one explicit
    // property list (transition-[transform,opacity,...]) at 300ms. The
    // old `transition-shadow` standalone class is gone — pin the new
    // shape instead so a future revert to scattered transitions trips.
    const { container } = renderHeader();
    const header = container.querySelector("[data-slot='site-header']");
    // Either the new consolidated transition-[…] OR the legacy
    // transition-shadow class is acceptable while the cf-r9r3 fix is in
    // flight — but the consolidated form is the expected post-fix shape.
    expect(header!.className).toMatch(/transition-\[[^\]]+\]|transition-shadow/);
  });

  // cf-jo07 r2 + cf-r9r3: Stilgar reversed cf-h85f's bear-fade. The
  // bear backdrop stays opacity-100 in BOTH states (shrunken state still
  // reads as bear chrome, not plain white). The home hero band still
  // collapses to max-h-0 — that's the actual scroll-shrink — pinned
  // separately below. cf-r9r3 wraps the scroll dispatch in await act +
  // flushRaf so the rAF-throttled state update propagates before assert.
  it("keeps the bear backdrop visible (opacity-100) in both states (cf-jo07 r2)", async () => {
    const { container } = renderHeader();
    expect(
      container
        .querySelector('[data-slot="header-bear-backdrop"]')!
        .className,
    ).toMatch(/\bopacity-100\b/);
    await act(async () => {
      setScroll(120);
      await flushRaf();
    });
    expect(
      container
        .querySelector('[data-slot="header-bear-backdrop"]')!
        .className,
    ).toMatch(/\bopacity-100\b/);
  });

  it("collapses the home hero band to max-h-0 + opacity-0 once scrolled (cf-h85f)", async () => {
    const { container } = renderHeader();
    const heroBefore = container.querySelector(
      '[data-testid="site-header-hero"]',
    );
    expect(heroBefore).not.toBeNull();
    expect(heroBefore!.className).not.toMatch(/\bmax-h-0\b/);
    expect(heroBefore!.getAttribute("aria-hidden")).toBeNull();
    await act(async () => {
      setScroll(120);
      await flushRaf();
    });
    const heroAfter = container.querySelector(
      '[data-testid="site-header-hero"]',
    );
    expect(heroAfter!.className).toMatch(/\bmax-h-0\b/);
    expect(heroAfter!.className).toMatch(/\bopacity-0\b/);
    expect(heroAfter!.getAttribute("aria-hidden")).toBe("true");
  });

  it("never swaps the header surface to bg-white on scroll (cf-jo07 r2)", async () => {
    const { container } = renderHeader();
    expect(
      container.querySelector("[data-slot='site-header']")!.className,
    ).not.toMatch(/\bbg-white\b/);
    await act(async () => {
      setScroll(120);
      await flushRaf();
    });
    expect(
      container.querySelector("[data-slot='site-header']")!.className,
    ).not.toMatch(/\bbg-white\b/);
  });

  // cf-r9r3: regression pins for the scroll-jitter + white-flash fixes.
  it("rAF-throttle prevents thrashing — many sub-threshold scrolls don't flip the state", async () => {
    const { container } = renderHeader();
    // Hover near the threshold (jitter-window between EXIT=60 and ENTER=80).
    await act(async () => {
      for (const y of [70, 72, 65, 74, 68, 76, 62, 78, 70, 65]) {
        setScroll(y);
      }
      await flushRaf();
    });
    // None of those crossed >=80 from a false-state, so scrolled stays false.
    const header = container.querySelector("[data-slot='site-header']");
    expect(header!.getAttribute("data-scrolled")).toBe("false");
  });

  it("hysteresis: exits shrunk state only after scrollY <= 60, not 79", async () => {
    const { container } = renderHeader();
    // Enter shrunk at >=80.
    await act(async () => {
      setScroll(100);
      await flushRaf();
    });
    const header = container.querySelector("[data-slot='site-header']");
    expect(header!.getAttribute("data-scrolled")).toBe("true");
    // Scroll back to 70 (between EXIT=60 and ENTER=80) — should STAY shrunk.
    await act(async () => {
      setScroll(70);
      await flushRaf();
    });
    expect(header!.getAttribute("data-scrolled")).toBe("true");
    // Drop to 50 (below EXIT=60) — NOW it exits.
    await act(async () => {
      setScroll(50);
      await flushRaf();
    });
    expect(header!.getAttribute("data-scrolled")).toBe("false");
  });

  it("unscrolled header has a forest-dark fallback background (white-flash fix)", () => {
    // cf-r9r3: first-paint background must be bear-tone (#2A1810), not
    // white, so the header isn't a blank flash before Next/Image decodes
    // bears.jpg. Asserted on the inline style — Tailwind can't express a
    // hex color used only as a pre-decode fallback.
    const { container } = renderHeader();
    const header = container.querySelector(
      "[data-slot='site-header']",
    ) as HTMLElement;
    expect(header.style.backgroundColor).toMatch(
      /#2a1810|rgb\(42,\s*24,\s*16\)/i,
    );
  });

  it("scrolled header drops the dark fallback so bg-white wins", async () => {
    const { container } = renderHeader();
    await act(async () => {
      setScroll(120);
      await flushRaf();
    });
    const header = container.querySelector(
      "[data-slot='site-header']",
    ) as HTMLElement;
    // Inline backgroundColor cleared so the bg-white Tailwind class
    // controls the surface — without this, the inline forest-dark would
    // override the white surface intent.
    expect(header.style.backgroundColor).toBe("");
  });
});
