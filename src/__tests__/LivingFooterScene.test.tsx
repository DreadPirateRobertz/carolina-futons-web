import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { LivingFooterScene } from "@/components/site/LivingFooterScene";

vi.mock("@/components/mascot/MascotCharacters", () => ({
  Bear: () => <g data-testid="bear" />,
}));

vi.mock("@/components/mascot/MascotPalette", () => ({
  V3_PAL: { ridge1: "#a", ridge2: "#b", ridge3: "#c", ink: "#d", cream: "#e" },
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

  it("keyframe style is injected into SVG defs with reduced-motion gate", () => {
    const { container } = render(<LivingFooterScene />);
    const style = container.querySelector("defs style");
    expect(style?.textContent).toContain("scale(1.03)");
    // Assert .lfs-bear-breathe is lexically inside the @media prefers-reduced-motion block
    expect(style?.textContent).toMatch(
      /@media[^{]*prefers-reduced-motion[^{]*no-preference[^{]*\{[\s\S]*\.lfs-bear-breathe/,
    );
  });
});
