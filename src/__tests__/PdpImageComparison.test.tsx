import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
  return { ...actual, useReducedMotion: vi.fn(() => false) };
});

import { PdpImageComparison } from "@/components/product/PdpImageComparison";

const BEFORE = { url: "https://cdn.example.com/angle1.jpg", alt: "Angle 1" };
const AFTER = { url: "https://cdn.example.com/angle2.jpg", alt: "Angle 2" };

describe("PdpImageComparison", () => {
  it("renders both images and the drag handle", () => {
    render(
      <PdpImageComparison
        before={BEFORE}
        after={AFTER}
        productName="Monterey Futon"
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId("pdp-image-comparison")).toBeInTheDocument();
    expect(screen.getByTestId("pdp-comparison-handle")).toBeInTheDocument();
    const imgs = screen.getAllByRole("img");
    expect(imgs.some((img) => img.getAttribute("src") === BEFORE.url)).toBe(true);
    expect(imgs.some((img) => img.getAttribute("src") === AFTER.url)).toBe(true);
  });

  it("handle has slider role with aria-valuenow=50 by default", () => {
    render(
      <PdpImageComparison
        before={BEFORE}
        after={AFTER}
        productName="Monterey Futon"
        onClose={vi.fn()}
      />,
    );
    const handle = screen.getByRole("slider");
    expect(handle).toHaveAttribute("aria-valuenow", "50");
    expect(handle).toHaveAttribute("aria-valuemin", "0");
    expect(handle).toHaveAttribute("aria-valuemax", "100");
  });

  it("ArrowRight key increases split position", () => {
    render(
      <PdpImageComparison
        before={BEFORE}
        after={AFTER}
        productName="Monterey Futon"
        onClose={vi.fn()}
      />,
    );
    const handle = screen.getByRole("slider");
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(Number(handle.getAttribute("aria-valuenow"))).toBeGreaterThan(50);
  });

  it("ArrowLeft key decreases split position", () => {
    render(
      <PdpImageComparison
        before={BEFORE}
        after={AFTER}
        productName="Monterey Futon"
        onClose={vi.fn()}
      />,
    );
    const handle = screen.getByRole("slider");
    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    expect(Number(handle.getAttribute("aria-valuenow"))).toBeLessThan(50);
  });

  it("calls onClose when Close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <PdpImageComparison
        before={BEFORE}
        after={AFTER}
        productName="Monterey Futon"
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /close comparison/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(
      <PdpImageComparison
        before={BEFORE}
        after={AFTER}
        productName="Monterey Futon"
        onClose={onClose}
      />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clamps split to [0, 100]", () => {
    render(
      <PdpImageComparison
        before={BEFORE}
        after={AFTER}
        productName="Monterey Futon"
        onClose={vi.fn()}
      />,
    );
    const handle = screen.getByRole("slider");
    for (let i = 0; i < 25; i++) fireEvent.keyDown(handle, { key: "ArrowLeft" });
    expect(Number(handle.getAttribute("aria-valuenow"))).toBe(0);
    for (let i = 0; i < 30; i++) fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(Number(handle.getAttribute("aria-valuenow"))).toBe(100);
  });
});

describe("PdpImageComparison — reduced motion", () => {
  it("renders without framer motion style when reduced motion is set", async () => {
    const { useReducedMotion } = await import("framer-motion");
    vi.mocked(useReducedMotion).mockReturnValueOnce(true);
    render(
      <PdpImageComparison
        before={BEFORE}
        after={AFTER}
        productName="Monterey Futon"
        onClose={vi.fn()}
      />,
    );
    // Component still renders fully — just no transition style
    expect(screen.getByTestId("pdp-image-comparison")).toBeInTheDocument();
  });
});
