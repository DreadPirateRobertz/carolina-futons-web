import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { PdpGallery } from "@/components/product/PdpGallery";

const motionMocks = vi.hoisted(() => ({
  useReducedMotion: vi.fn<() => boolean | null>(() => false),
  useScroll: vi.fn(() => ({ scrollYProgress: { __isMotionValue: true } })),
  useTransform: vi.fn(
    (
      _value: unknown,
      _input: ReadonlyArray<number>,
      _output: ReadonlyArray<number>,
    ) => ({ __scaleMotionValue: true }),
  ),
}));

vi.mock("framer-motion", () => ({
  m: { div: "div", img: "img" },
  useReducedMotion: motionMocks.useReducedMotion,
  useScroll: motionMocks.useScroll,
  useTransform: motionMocks.useTransform,
}));

const multiImages = [
  { url: "https://img/a.jpg", alt: "Front" },
  { url: "https://img/b.jpg", alt: "Side" },
  { url: "https://img/c.jpg", alt: "Detail" },
];

describe("PdpGallery", () => {
  it("renders the first image as the main image by default", () => {
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    expect(main.src).toBe("https://img/a.jpg");
    expect(main.alt).toBe("Front");
  });

  it("renders a thumb for each image", () => {
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const thumbs = screen.getAllByRole("tab");
    expect(thumbs).toHaveLength(3);
  });

  it("swaps the main image when a thumb is clicked", () => {
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const thumbs = screen.getAllByRole("tab");
    fireEvent.click(thumbs[1]);
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    expect(main.src).toBe("https://img/b.jpg");
    expect(thumbs[1].getAttribute("aria-selected")).toBe("true");
    expect(thumbs[0].getAttribute("aria-selected")).toBe("false");
  });

  it("arrow-right advances to the next thumb", () => {
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const tablist = screen.getByRole("tablist");
    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    expect(main.src).toBe("https://img/b.jpg");
  });

  it("arrow-left wraps back to the last thumb from the first", () => {
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const tablist = screen.getByRole("tablist");
    fireEvent.keyDown(tablist, { key: "ArrowLeft" });
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    expect(main.src).toBe("https://img/c.jpg");
  });

  it("arrow-right wraps forward from the last thumb to the first", () => {
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const tablist = screen.getByRole("tablist");
    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    expect(main.src).toBe("https://img/a.jpg");
  });

  it("uses productName as the alt when an image has no alt", () => {
    render(
      <PdpGallery
        images={[{ url: "https://img/x.jpg" }]}
        productName="Kingston Futon"
      />,
    );
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    expect(main.alt).toBe("Kingston Futon");
  });

  it("renders the single main image and no tablist when only one image is supplied", () => {
    render(
      <PdpGallery
        images={[{ url: "https://img/only.jpg" }]}
        productName="Kingston Futon"
      />,
    );
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    expect(main.src).toBe("https://img/only.jpg");
    expect(screen.queryByRole("tablist")).toBeNull();
  });

  it("renders the empty-state placeholder when images is empty", () => {
    render(<PdpGallery images={[]} productName="Kingston Futon" />);
    expect(screen.queryByTestId("pdp-main-image")).toBeNull();
    expect(screen.getByTestId("pdp-gallery-empty")).toBeInTheDocument();
  });

  it("thumb has aria-label announcing position for screen readers", () => {
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const thumbs = screen.getAllByRole("tab");
    expect(thumbs[0].getAttribute("aria-label")).toMatch(/1 of 3/);
    expect(thumbs[2].getAttribute("aria-label")).toMatch(/3 of 3/);
  });

  // Wraps the main image in a scroll-driven zoom container. The wrapper div
  // has overflow-hidden so the zoom doesn't bleed outside the gallery
  // footprint; the testid stays on the inner img so existing assertions
  // still pass.
  it("wraps the main image in an overflow-hidden zoom container", () => {
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const main = screen.getByTestId("pdp-main-image");
    const zoomContainer = main.parentElement;
    expect(zoomContainer).not.toBeNull();
    expect(zoomContainer!.className).toMatch(/overflow-hidden/);
  });
});

// WCAG 2.3.3 (Animation from Interactions, AAA) — when the user has set
// prefers-reduced-motion, the scroll-driven scale must be suppressed
// entirely. These tests stub framer-motion so we can flip useReducedMotion
// and inspect the rendered style + the scale curve we hand to useTransform.
describe("PdpGallery — prefers-reduced-motion", () => {
  beforeEach(() => {
    motionMocks.useReducedMotion.mockReset();
    motionMocks.useTransform.mockClear();
  });

  it("omits the scale style entirely when prefers-reduced-motion is set", () => {
    motionMocks.useReducedMotion.mockReturnValue(true);
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    // No transform, no scale — byte-for-byte static.
    expect(main.style.transform).toBe("");
    expect(main.getAttribute("style") ?? "").not.toMatch(/scale/);
  });

  it("applies the scale MotionValue when prefers-reduced-motion is unset", () => {
    motionMocks.useReducedMotion.mockReturnValue(false);
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    // useTransform is what produces the scale MotionValue; if we ran it,
    // the reduce branch was not taken and the style was wired through.
    expect(motionMocks.useTransform).toHaveBeenCalled();
  });

  it("uses a peak-and-return scale curve capped at 1.05", () => {
    motionMocks.useReducedMotion.mockReturnValue(false);
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    expect(motionMocks.useTransform).toHaveBeenCalledWith(
      expect.anything(),
      [0, 0.5, 1],
      [1, 1.05, 1],
    );
  });
});
