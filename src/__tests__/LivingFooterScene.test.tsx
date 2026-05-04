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
    const { container: c } = render(<LivingFooterScene />);
    const root = c.firstChild as HTMLElement;
    expect(root.getAttribute("aria-hidden")).toBe("true");
  });

  it("is absolutely positioned at top-0 (no longer in flow)", () => {
    const { container: c } = render(<LivingFooterScene />);
    const root = c.firstChild as HTMLElement;
    expect(root.className).toMatch(/absolute/);
    expect(root.className).toMatch(/top-0/);
  });

  it("bear group has bear-breathe animation class", () => {
    const { container: c } = render(<LivingFooterScene />);
    const animGroup = c.querySelector(".bear-breathe");
    expect(animGroup).not.toBeNull();
  });

  it("bear-breathe group is nested inside a positioning translate group", () => {
    const { container: c } = render(<LivingFooterScene />);
    const animGroup = c.querySelector(".bear-breathe");
    const parent = animGroup?.parentElement;
    expect(parent?.tagName).toBe("g");
    expect(parent?.getAttribute("transform")).toMatch(/translate/);
  });

  it("keyframe style is injected into SVG defs", () => {
    const { container: c } = render(<LivingFooterScene />);
    const style = c.querySelector("defs style");
    expect(style?.textContent).toContain("bear-breathe");
    expect(style?.textContent).toContain("scale(1.03)");
    expect(style?.textContent).toContain("prefers-reduced-motion");
  });
});
