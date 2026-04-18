import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// cf-3qt.7.M.1 (cf-2i7): ScrollZoomImage pins src/alt/testid rendering and
// the reduced-motion bypass. Scroll-driven scale values are not asserted
// directly — jsdom has no layout/scroll, so useScroll stays at 0 and visual
// correctness is verified in the browser. What we pin here is the contract
// that downstream (PdpGallery, future motion consumers) depends on.

const mockUseReducedMotion = vi.fn<() => boolean | null>();

vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
  return {
    ...actual,
    useReducedMotion: () => mockUseReducedMotion(),
  };
});

import { ScrollZoomImage } from "@/components/motion/ScrollZoomImage";

describe("ScrollZoomImage", () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReset();
    mockUseReducedMotion.mockReturnValue(false);
  });

  it("renders an img with the provided src, alt, and testid", () => {
    render(
      <ScrollZoomImage
        src="https://img/kingston.jpg"
        alt="Kingston Futon"
        data-testid="pdp-main-image"
      />,
    );
    const img = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    expect(img.src).toBe("https://img/kingston.jpg");
    expect(img.alt).toBe("Kingston Futon");
    expect(img.tagName).toBe("IMG");
  });

  it("applies className to the outer wrapper and imgClassName to the inner img", () => {
    render(
      <ScrollZoomImage
        src="https://img/a.jpg"
        alt="A"
        data-testid="main"
        className="aspect-square overflow-hidden"
        imgClassName="h-full w-full object-cover"
      />,
    );
    const img = screen.getByTestId("main") as HTMLImageElement;
    expect(img.className).toBe("h-full w-full object-cover");
    const wrapper = img.parentElement as HTMLElement;
    expect(wrapper.className).toContain("aspect-square");
    expect(wrapper.className).toContain("overflow-hidden");
  });

  it("renders a plain div (no motion component) when prefers-reduced-motion is set", () => {
    // Reduced-motion users get a zero-overhead render: no MotionValue
    // subscriptions, no style={{ scale }} inline style to repaint on scroll.
    mockUseReducedMotion.mockReturnValue(true);
    render(
      <ScrollZoomImage
        src="https://img/r.jpg"
        alt="Reduced"
        data-testid="reduced"
      />,
    );
    const img = screen.getByTestId("reduced") as HTMLImageElement;
    const wrapper = img.parentElement as HTMLElement;
    // Motion components apply an inline transform; the reduced branch must not.
    expect(wrapper.style.transform).toBe("");
    expect(img.src).toBe("https://img/r.jpg");
    expect(img.alt).toBe("Reduced");
  });

  it("keeps src/alt accessible when motion is enabled (non-reduced)", () => {
    mockUseReducedMotion.mockReturnValue(false);
    render(
      <ScrollZoomImage
        src="https://img/m.jpg"
        alt="Motion variant"
        data-testid="motion"
      />,
    );
    const img = screen.getByTestId("motion") as HTMLImageElement;
    expect(img.src).toBe("https://img/m.jpg");
    expect(img.alt).toBe("Motion variant");
  });
});
