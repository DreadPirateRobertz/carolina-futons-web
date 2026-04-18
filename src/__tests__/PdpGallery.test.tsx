import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { PdpGallery } from "@/components/product/PdpGallery";

type FakeViewTransition = {
  finished: Promise<undefined>;
  skipTransition: ReturnType<typeof vi.fn>;
};

function installViewTransitionStub(
  impl?: (cb: () => void) => FakeViewTransition,
) {
  const skips: Array<FakeViewTransition["skipTransition"]> = [];
  const defaultImpl = (cb: () => void): FakeViewTransition => {
    cb();
    const skip = vi.fn();
    skips.push(skip);
    return {
      finished: new Promise<undefined>(() => {}),
      skipTransition: skip,
    };
  };
  const startVT = vi.fn(impl ?? defaultImpl);
  Object.defineProperty(document, "startViewTransition", {
    value: startVT,
    configurable: true,
    writable: true,
  });
  return { startVT, skips };
}

function uninstallViewTransitionStub() {
  // Reset to undefined so other suites see an unsupported environment.
  Object.defineProperty(document, "startViewTransition", {
    value: undefined,
    configurable: true,
    writable: true,
  });
}

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

// cf-3qt.7.O.1: View Transitions API for thumb→main image swap.
// Browser-native morph in Chromium 111+/Safari 18+; framer crossfade falls
// back for older browsers; reduced-motion = instant swap with no transition.
describe("PdpGallery — View Transitions API", () => {
  beforeEach(() => {
    motionMocks.useReducedMotion.mockReset();
    motionMocks.useReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    uninstallViewTransitionStub();
  });

  it("calls document.startViewTransition when the API is supported", () => {
    const { startVT } = installViewTransitionStub();
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const thumbs = screen.getAllByRole("tab");
    fireEvent.click(thumbs[1]);
    expect(startVT).toHaveBeenCalledTimes(1);
    // The new image is committed inside the transition callback.
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    expect(main.src).toBe("https://img/b.jpg");
  });

  it("falls back to direct state update when the API is unavailable", () => {
    // Don't install — startViewTransition stays undefined for this test.
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const thumbs = screen.getAllByRole("tab");
    fireEvent.click(thumbs[1]);
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    expect(main.src).toBe("https://img/b.jpg");
    expect(thumbs[1].getAttribute("aria-selected")).toBe("true");
  });

  it("skips the View Transitions path when prefers-reduced-motion is set", () => {
    const { startVT } = installViewTransitionStub();
    motionMocks.useReducedMotion.mockReturnValue(true);
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const thumbs = screen.getAllByRole("tab");
    fireEvent.click(thumbs[1]);
    // WCAG 2.3.3: reduced-motion users get an instant swap, no animation —
    // the API is gated behind both feature support AND the reduce flag.
    expect(startVT).not.toHaveBeenCalled();
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    expect(main.src).toBe("https://img/b.jpg");
  });

  it("cancels the in-flight transition with skipTransition on rapid click", () => {
    const { startVT, skips } = installViewTransitionStub();
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const thumbs = screen.getAllByRole("tab");
    fireEvent.click(thumbs[1]);
    fireEvent.click(thumbs[2]);
    // Two transitions started; the first one was skipped when the second
    // click landed (prevents queue/lag on rapid clicks).
    expect(startVT).toHaveBeenCalledTimes(2);
    expect(skips[0]).toHaveBeenCalledTimes(1);
    expect(skips[1]).not.toHaveBeenCalled();
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    expect(main.src).toBe("https://img/c.jpg");
  });
});

describe("PdpGallery — onError / broken image fallback", () => {
  beforeEach(() => uninstallViewTransitionStub());

  it("main image falls back to FALLBACK data URI on load error", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    fireEvent.error(main);
    expect(main.src).toMatch(/^data:image\/png/);
    warnSpy.mockRestore();
  });

  it("main image onError logs console.warn with the original broken src", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    fireEvent.error(main);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[PdpGallery]"),
      "https://img/a.jpg",
    );
    warnSpy.mockRestore();
  });

  it("second error on same image logs console.error (fallback also failed)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<PdpGallery images={multiImages} productName="Kingston Futon" />);
    const main = screen.getByTestId("pdp-main-image") as HTMLImageElement;
    fireEvent.error(main);
    fireEvent.error(main); // fallback also errored
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[PdpGallery] fallback"),
      "https://img/a.jpg",
    );
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("thumbnail image falls back on load error", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container } = render(
      <PdpGallery images={multiImages} productName="Kingston Futon" />,
    );
    const thumbImgs = container.querySelectorAll(
      "[role='tab'] img",
    ) as NodeListOf<HTMLImageElement>;
    fireEvent.error(thumbImgs[1]);
    expect(thumbImgs[1].src).toMatch(/^data:image\/png/);
    warnSpy.mockRestore();
  });

  it("thumbnail onError logs warn with the correct broken src and context", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container } = render(
      <PdpGallery images={multiImages} productName="Kingston Futon" />,
    );
    const thumbImgs = container.querySelectorAll(
      "[role='tab'] img",
    ) as NodeListOf<HTMLImageElement>;
    fireEvent.error(thumbImgs[0]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("thumb 0"),
      "https://img/a.jpg",
    );
    warnSpy.mockRestore();
  });
});
