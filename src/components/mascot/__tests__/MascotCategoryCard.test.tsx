import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode, CSSProperties } from "react";

// cf-3qt.16.3: MascotCategoryCard unit tests.
// Covers: animal variants, href/aria-label, subtitle, accent style,
// and the useReducedMotion guard (animate → undefined when reduced=true).

// ── Framer Motion mock ───────────────────────────────────────────────────────
// vi.mock replaces the entire framer-motion module. Our useReducedMotion shim
// reads window.matchMedia directly so the stubMatchMedia helper can control
// what the component's prefersReducedMotion branch sees.

const mocks = vi.hoisted(() => ({
  cardAnimate: undefined as unknown,
  animalAnimate: undefined as unknown,
  shopNowAnimate: undefined as unknown,
}));

vi.mock("framer-motion", () => ({
  useReducedMotion: () => {
    if (typeof window === "undefined") return null;
    const mql = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    return mql?.matches ?? null;
  },
  motion: {
    a: ({
      href,
      animate,
      children,
      style,
      "aria-label": ariaLabel,
      ...rest
    }: {
      href?: string;
      animate?: unknown;
      children?: ReactNode;
      style?: CSSProperties;
      "aria-label"?: string;
      [key: string]: unknown;
    }) => {
      mocks.cardAnimate = animate;
      return (
        <a href={href} aria-label={ariaLabel} style={style} {...rest}>
          {children}
        </a>
      );
    },
    g: ({
      animate,
      children,
      ...rest
    }: {
      animate?: unknown;
      children?: ReactNode;
      [key: string]: unknown;
    }) => {
      mocks.animalAnimate = animate;
      return <g {...rest}>{children}</g>;
    },
    div: ({
      animate,
      children,
      ...rest
    }: {
      animate?: unknown;
      children?: ReactNode;
      [key: string]: unknown;
    }) => {
      mocks.shopNowAnimate = animate;
      return <div {...rest}>{children}</div>;
    },
  },
}));

// ── MascotCharacters mock ────────────────────────────────────────────────────

vi.mock("@/components/mascot/MascotCharacters", () => ({
  Bear: () => <g data-testid="animal-bear" />,
  Fox:  () => <g data-testid="animal-fox" />,
  Deer: () => <g data-testid="animal-deer" />,
  Owl:  () => <g data-testid="animal-owl" />,
}));

// ── Palette mock ─────────────────────────────────────────────────────────────

vi.mock("@/components/mascot/MascotPalette", () => ({
  V3_PAL: {
    paperWarm: "#FAF7F2",
    ink:       "#3A2518",
    inkSoft:   "#5A4033",
    sun:       "#F5C97A",
    ridge1:    "#6B4C3B",
    ridge2:    "#7D6351",
    ridge3:    "#B5A08A",
  },
}));

// ── matchMedia stub ──────────────────────────────────────────────────────────

function stubMatchMedia(prefersReduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: prefersReduce && query.includes("reduce"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

// ── Import under test ────────────────────────────────────────────────────────

import { MascotCategoryCard } from "../MascotCategoryCard";

// ── Helpers ──────────────────────────────────────────────────────────────────

function renderCard(overrides: Partial<Parameters<typeof MascotCategoryCard>[0]> = {}) {
  const defaults = {
    title:    "Futon Frames",
    subtitle: "Solid hardwood",
    animal:   "bear" as const,
    accent:   "#F5C97A",
    href:     "/shop/futon-frames",
  };
  return render(<MascotCategoryCard {...defaults} {...overrides} />);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("MascotCategoryCard", () => {
  beforeEach(() => {
    stubMatchMedia(false);
    mocks.cardAnimate = undefined;
    mocks.animalAnimate = undefined;
    mocks.shopNowAnimate = undefined;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── Animal variants ──────────────────────────────────────────────────────

  describe("animal variants", () => {
    it.each([
      ["bear", "animal-bear"],
      ["fox",  "animal-fox"],
      ["deer", "animal-deer"],
      ["owl",  "animal-owl"],
    ] as const)("%s renders the correct mascot", (animal, testid) => {
      renderCard({ animal });
      expect(document.querySelector(`[data-testid="${testid}"]`)).not.toBeNull();
    });
  });

  // ── Link / routing ───────────────────────────────────────────────────────

  describe("href and aria-label", () => {
    it("uses title as the aria-label", () => {
      renderCard({ title: "Murphy Cabinet Beds", href: "/shop/murphy-cabinet-beds" });
      expect(screen.getByRole("link")).toHaveAttribute("aria-label", "Murphy Cabinet Beds");
    });

    it.each([
      ["Futon Frames",        "/shop/futon-frames"],
      ["Murphy Cabinet Beds", "/shop/murphy-cabinet-beds"],
      ["Platform Beds",       "/shop/platform-beds"],
      ["Mattresses",          "/shop/mattresses"],
    ] as const)("%s links to %s", (title, href) => {
      renderCard({ title, href });
      expect(screen.getByRole("link")).toHaveAttribute("href", href);
    });
  });

  // ── Text content ─────────────────────────────────────────────────────────

  it("renders the subtitle text", () => {
    renderCard({ subtitle: "Space-saving" });
    expect(screen.getByText("Space-saving")).toBeInTheDocument();
  });

  it("renders the title text", () => {
    renderCard({ title: "Platform Beds" });
    expect(screen.getByText("Platform Beds")).toBeInTheDocument();
  });

  // ── Accent color ─────────────────────────────────────────────────────────

  it("initial background is paperWarm (not accent) before hover", () => {
    renderCard({ accent: "#FF0000" });
    const link = screen.getByRole("link");
    const style = link.getAttribute("style") ?? "";
    // hover=false on mount → background is palette's paperWarm (rgb of #FAF7F2), not the accent
    expect(style).toMatch(/rgb\(250,\s*247,\s*242\)|#FAF7F2/i);
    expect(style).not.toContain("#FF0000");
  });

  // ── useReducedMotion guard ────────────────────────────────────────────────

  describe("useReducedMotion guard", () => {
    it("card animate is not undefined when reduced motion is OFF", () => {
      stubMatchMedia(false);
      renderCard();
      expect(screen.getByRole("link")).toBeInTheDocument();
      expect(mocks.cardAnimate).not.toBeUndefined();
    });

    it("animal motion.g animate is not undefined when reduced motion is OFF", () => {
      stubMatchMedia(false);
      renderCard();
      expect(screen.getByRole("link")).toBeInTheDocument();
      expect(mocks.animalAnimate).not.toBeUndefined();
    });

    it("shop-now arrow animate is not undefined when reduced motion is OFF", () => {
      stubMatchMedia(false);
      renderCard();
      expect(screen.getByRole("link")).toBeInTheDocument();
      expect(mocks.shopNowAnimate).not.toBeUndefined();
    });

    it("card animate is undefined when reduced motion is ON", () => {
      stubMatchMedia(true);
      mocks.cardAnimate = "sentinel"; // sentinel: proves mock was called and set animate to undefined
      renderCard();
      expect(mocks.cardAnimate).toBeUndefined();
    });

    it("animal motion.g animate is undefined when reduced motion is ON", () => {
      stubMatchMedia(true);
      mocks.animalAnimate = "sentinel";
      renderCard();
      expect(mocks.animalAnimate).toBeUndefined();
    });

    it("shop-now arrow animate is undefined when reduced motion is ON", () => {
      stubMatchMedia(true);
      mocks.shopNowAnimate = "sentinel";
      renderCard();
      expect(mocks.shopNowAnimate).toBeUndefined();
    });
  });
});
