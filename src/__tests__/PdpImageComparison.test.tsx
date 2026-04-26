import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

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

describe("PdpImageComparison — pointer events", () => {
  let getBoundingClientRectSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Mock getBoundingClientRect to simulate a 400px-wide container at x=0
    getBoundingClientRectSpy = vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
      left: 0,
      width: 400,
      top: 0,
      bottom: 400,
      right: 400,
      height: 400,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
  });

  afterEach(() => {
    getBoundingClientRectSpy.mockRestore();
  });

  it("pointerdown + pointermove updates split position", () => {
    render(
      <PdpImageComparison
        before={BEFORE}
        after={AFTER}
        productName="Monterey Futon"
        onClose={vi.fn()}
      />,
    );
    const handle = screen.getByRole("slider");
    fireEvent.pointerDown(handle, { clientX: 200 }); // 200/400 = 50% (same)
    fireEvent.pointerMove(handle, { clientX: 300 }); // 300/400 = 75%
    expect(Number(handle.getAttribute("aria-valuenow"))).toBeCloseTo(75, 0);
  });

  it("pointermove without pointerdown does not move split", () => {
    render(
      <PdpImageComparison
        before={BEFORE}
        after={AFTER}
        productName="Monterey Futon"
        onClose={vi.fn()}
      />,
    );
    const handle = screen.getByRole("slider");
    fireEvent.pointerMove(handle, { clientX: 300 });
    // No prior pointerDown — dragging.current is false, split unchanged
    expect(Number(handle.getAttribute("aria-valuenow"))).toBe(50);
  });

  it("pointerup stops further pointermove updates", () => {
    render(
      <PdpImageComparison
        before={BEFORE}
        after={AFTER}
        productName="Monterey Futon"
        onClose={vi.fn()}
      />,
    );
    const handle = screen.getByRole("slider");
    fireEvent.pointerDown(handle, { clientX: 100 });
    fireEvent.pointerMove(handle, { clientX: 200 }); // moves to 50%
    fireEvent.pointerUp(handle);
    fireEvent.pointerMove(handle, { clientX: 300 }); // should NOT move to 75%
    expect(Number(handle.getAttribute("aria-valuenow"))).toBeCloseTo(50, 0);
  });

  it("clamps pointer position to [0, 100]", () => {
    render(
      <PdpImageComparison
        before={BEFORE}
        after={AFTER}
        productName="Monterey Futon"
        onClose={vi.fn()}
      />,
    );
    const handle = screen.getByRole("slider");
    fireEvent.pointerDown(handle, { clientX: -100 }); // before left edge
    expect(Number(handle.getAttribute("aria-valuenow"))).toBe(0);
    fireEvent.pointerMove(handle, { clientX: 9999 }); // past right edge
    expect(Number(handle.getAttribute("aria-valuenow"))).toBe(100);
  });

  it("returns early when containerRef has no rect (null guard)", () => {
    getBoundingClientRectSpy.mockReturnValueOnce(null as unknown as DOMRect);
    render(
      <PdpImageComparison
        before={BEFORE}
        after={AFTER}
        productName="Monterey Futon"
        onClose={vi.fn()}
      />,
    );
    const handle = screen.getByRole("slider");
    fireEvent.pointerDown(handle, { clientX: 100 });
    // Split should remain at default 50 — updateFromClientX early-returned
    expect(Number(handle.getAttribute("aria-valuenow"))).toBe(50);
  });
});
