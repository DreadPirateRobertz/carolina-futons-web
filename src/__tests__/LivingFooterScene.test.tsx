import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { LivingFooterScene } from "@/components/site/LivingFooterScene";

vi.mock("@/components/mascot/MascotCharacters", () => ({
  Bear: () => <g data-testid="bear" />,
}));

vi.mock("@/components/mascot/MascotPalette", () => ({
  V3_PAL: {
    ridge1: "#1a",
    ridge2: "#2b",
    ridge3: "#3c",
    ridge5: "#e0f0ff",
    ink: "#d",
    cream: "#e",
  },
}));

describe("LivingFooterScene", () => {
  it("renders aria-hidden — decorative only", () => {
    const { container } = render(<LivingFooterScene />);
    const root = container.firstChild as HTMLElement;
    expect(root.getAttribute("aria-hidden")).toBe("true");
  });

  it("is absolutely positioned at top-0 (no longer in flow)", () => {
    const { container } = render(<LivingFooterScene />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/absolute/);
    expect(root.className).toMatch(/top-0/);
  });

  it("bear group has lfs-bear-breathe animation class and contains the bear", () => {
    const { container } = render(<LivingFooterScene />);
    const animGroup = container.querySelector(".lfs-bear-breathe");
    expect(animGroup).not.toBeNull();
    expect(animGroup?.querySelector('[data-testid="bear"]')).not.toBeNull();
  });

  it("lfs-bear-breathe group is nested inside a positioning translate group", () => {
    const { container } = render(<LivingFooterScene />);
    const animGroup = container.querySelector(".lfs-bear-breathe");
    const parent = animGroup?.parentElement;
    expect(parent?.tagName).toBe("g");
    expect(parent?.getAttribute("transform")).toMatch(/translate/);
  });

  it("bear-breathe keyframe is injected into SVG defs with reduced-motion gate", () => {
    const { container } = render(<LivingFooterScene />);
    const style = container.querySelector("defs style");
    expect(style?.textContent).toContain("scale(1.03)");
    expect(style?.textContent).toMatch(
      /@media[^{]*prefers-reduced-motion[^{]*no-preference[^{]*\{[\s\S]*\.lfs-bear-breathe/,
    );
  });

  // ── Mist particles ────────────────────────────────────────────────────────

  it("renders exactly 10 mist particles", () => {
    const { container } = render(<LivingFooterScene />);
    const particles = container.querySelectorAll("circle.lfs-mist");
    expect(particles).toHaveLength(10);
  });

  it("each mist particle has --mx, --md, --ml CSS custom props set", () => {
    const { container } = render(<LivingFooterScene />);
    const particles = container.querySelectorAll<SVGCircleElement>("circle.lfs-mist");
    particles.forEach((circle) => {
      const style = circle.getAttribute("style") ?? "";
      expect(style).toMatch(/--mx:/);
      expect(style).toMatch(/--md:/);
      expect(style).toMatch(/--ml:/);
    });
  });

  it("lfs-mist-rise keyframe is injected in defs style", () => {
    const { container } = render(<LivingFooterScene />);
    const style = container.querySelector("defs style");
    expect(style?.textContent).toContain("lfs-mist-rise");
    expect(style?.textContent).toContain("translate(var(--mx)");
  });

  it(".lfs-mist animation is gated inside prefers-reduced-motion: no-preference", () => {
    const { container } = render(<LivingFooterScene />);
    const style = container.querySelector("defs style");
    expect(style?.textContent).toMatch(
      /@media[^{]*prefers-reduced-motion[^{]*no-preference[^{]*\{[\s\S]*\.lfs-mist/,
    );
  });

  it("mist particles use ridge5-derived fill (distinct from ridge1/2/3 ridges)", () => {
    const { container } = render(<LivingFooterScene />);
    const firstParticle = container.querySelector("circle.lfs-mist");
    const fill = firstParticle?.getAttribute("fill") ?? "";
    // Fill is ridge5 hex + "66" alpha — should contain the mock ridge5 value
    expect(fill.toLowerCase()).toContain("#e0f0ff");
  });
});
