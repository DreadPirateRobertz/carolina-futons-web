import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, act } from "@testing-library/react";

// cfw-zd8: full-screen gallery zoom lightbox. Adds pinch/wheel zoom,
// pan/drag while zoomed, ←/→ keys + swipe nav, focus trap, body
// scroll-lock. Pointer-gesture details (pinch math, pan bounds, swipe
// threshold) are covered in e2e — jsdom's PointerEvent surface is partial,
// so unit tests focus on the contract: open/close, keyboard nav, scroll
// lock, focus, reduced-motion.

const motionMocks = vi.hoisted(() => ({
  useReducedMotion: vi.fn<() => boolean | null>(() => false),
  divCalls: [] as Array<{
    initial?: unknown;
    animate?: unknown;
    transition?: unknown;
  }>,
}));

vi.mock("framer-motion", () => ({
  m: {
    div: ({
      children,
      initial,
      animate,
      transition,
      ...rest
    }: {
      children?: React.ReactNode;
      initial?: unknown;
      animate?: unknown;
      transition?: unknown;
    } & Record<string, unknown>) => {
      motionMocks.divCalls.push({ initial, animate, transition });
      return <div {...rest}>{children}</div>;
    },
  },
  useReducedMotion: motionMocks.useReducedMotion,
}));

beforeEach(() => {
  motionMocks.divCalls = [];
  motionMocks.useReducedMotion.mockReturnValue(false);
  document.body.style.overflow = "";
});

import { GalleryZoomLightbox } from "@/components/product/GalleryZoomLightbox";

const IMAGES = [
  { url: "https://img/a.jpg", alt: "Front" },
  { url: "https://img/b.jpg", alt: "Side" },
  { url: "https://img/c.jpg", alt: "Detail" },
];

const defaults = {
  images: IMAGES,
  initialIndex: 0,
  productName: "Kingston Futon Frame",
};

describe("GalleryZoomLightbox — open/closed", () => {
  it("renders nothing when open=false", () => {
    const { container } = render(
      <GalleryZoomLightbox {...defaults} open={false} onClose={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a modal dialog when open=true", () => {
    render(<GalleryZoomLightbox {...defaults} open onClose={() => {}} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-label")).toContain("Front");
    expect(dialog.getAttribute("aria-label")).toContain("1 of 3");
  });

  it("renders the image at initialIndex", () => {
    render(
      <GalleryZoomLightbox
        {...defaults}
        initialIndex={1}
        open
        onClose={() => {}}
      />,
    );
    const img = screen.getByTestId("gallery-zoom-image") as HTMLImageElement;
    expect(img.src).toBe("https://img/b.jpg");
    expect(img.alt).toBe("Side");
  });

  it("clamps an out-of-range initialIndex into bounds", () => {
    render(
      <GalleryZoomLightbox
        {...defaults}
        initialIndex={99}
        open
        onClose={() => {}}
      />,
    );
    const img = screen.getByTestId("gallery-zoom-image") as HTMLImageElement;
    expect(img.src).toBe("https://img/c.jpg");
  });

  it("renders nothing when images list is empty even if open", () => {
    const { container } = render(
      <GalleryZoomLightbox
        {...defaults}
        images={[]}
        open
        onClose={() => {}}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe("GalleryZoomLightbox — dismissal", () => {
  it("invokes onClose when ESC is pressed", () => {
    const onClose = vi.fn();
    render(<GalleryZoomLightbox {...defaults} open onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("invokes onClose when the close button is activated", () => {
    const onClose = vi.fn();
    render(<GalleryZoomLightbox {...defaults} open onClose={onClose} />);
    fireEvent.click(screen.getByTestId("gallery-zoom-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("invokes onClose when the backdrop is clicked", () => {
    const onClose = vi.fn();
    render(<GalleryZoomLightbox {...defaults} open onClose={onClose} />);
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does NOT close when the image itself is clicked", () => {
    const onClose = vi.fn();
    render(<GalleryZoomLightbox {...defaults} open onClose={onClose} />);
    fireEvent.click(screen.getByTestId("gallery-zoom-image"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("unsubscribes the ESC listener when the dialog closes", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <GalleryZoomLightbox {...defaults} open onClose={onClose} />,
    );
    rerender(
      <GalleryZoomLightbox {...defaults} open={false} onClose={onClose} />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("GalleryZoomLightbox — keyboard navigation", () => {
  it("ArrowRight advances to the next image and updates the counter", () => {
    render(<GalleryZoomLightbox {...defaults} open onClose={() => {}} />);
    fireEvent.keyDown(document, { key: "ArrowRight" });
    const img = screen.getByTestId("gallery-zoom-image") as HTMLImageElement;
    expect(img.src).toBe("https://img/b.jpg");
    expect(screen.getByTestId("gallery-zoom-counter").textContent).toBe("2 / 3");
  });

  it("ArrowLeft retreats to the previous image (wraps from first to last)", () => {
    render(<GalleryZoomLightbox {...defaults} open onClose={() => {}} />);
    fireEvent.keyDown(document, { key: "ArrowLeft" });
    const img = screen.getByTestId("gallery-zoom-image") as HTMLImageElement;
    expect(img.src).toBe("https://img/c.jpg");
  });

  it("does not navigate when there is only one image", () => {
    const onClose = vi.fn();
    render(
      <GalleryZoomLightbox
        {...defaults}
        images={[IMAGES[0]]}
        open
        onClose={onClose}
      />,
    );
    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(screen.queryByTestId("gallery-zoom-counter")).toBeNull();
    expect(screen.queryByTestId("gallery-zoom-next")).toBeNull();
  });

  it("Next button advances; Previous button retreats", () => {
    render(<GalleryZoomLightbox {...defaults} open onClose={() => {}} />);
    fireEvent.click(screen.getByTestId("gallery-zoom-next"));
    expect(
      (screen.getByTestId("gallery-zoom-image") as HTMLImageElement).src,
    ).toBe("https://img/b.jpg");
    fireEvent.click(screen.getByTestId("gallery-zoom-prev"));
    expect(
      (screen.getByTestId("gallery-zoom-image") as HTMLImageElement).src,
    ).toBe("https://img/a.jpg");
  });
});

describe("GalleryZoomLightbox — body scroll lock", () => {
  it("locks body scroll while open and restores prior overflow on close", () => {
    document.body.style.overflow = "auto";
    const { rerender } = render(
      <GalleryZoomLightbox {...defaults} open onClose={() => {}} />,
    );
    expect(document.body.style.overflow).toBe("hidden");
    rerender(
      <GalleryZoomLightbox {...defaults} open={false} onClose={() => {}} />,
    );
    expect(document.body.style.overflow).toBe("auto");
  });
});

describe("GalleryZoomLightbox — focus + a11y", () => {
  it("moves focus to the close button when opened", () => {
    render(<GalleryZoomLightbox {...defaults} open onClose={() => {}} />);
    expect(document.activeElement).toBe(
      screen.getByTestId("gallery-zoom-close"),
    );
  });

  it("exposes an sr-only heading and labelledby on the dialog", () => {
    render(<GalleryZoomLightbox {...defaults} open onClose={() => {}} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-labelledby")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2 }).textContent).toContain(
      "Kingston Futon Frame",
    );
  });
});

describe("GalleryZoomLightbox — reduced motion", () => {
  it("omits framer crossfade props under reduced motion", () => {
    motionMocks.useReducedMotion.mockReturnValue(true);
    render(<GalleryZoomLightbox {...defaults} open onClose={() => {}} />);
    expect(motionMocks.divCalls[0].initial).toBeUndefined();
    expect(motionMocks.divCalls[0].animate).toBeUndefined();
    expect(motionMocks.divCalls[0].transition).toBeUndefined();
  });

  it("applies the crossfade props under normal motion", () => {
    motionMocks.useReducedMotion.mockReturnValue(false);
    render(<GalleryZoomLightbox {...defaults} open onClose={() => {}} />);
    expect(motionMocks.divCalls[0].initial).toEqual({ opacity: 0 });
    expect(motionMocks.divCalls[0].animate).toEqual({ opacity: 1 });
  });

  it("tags the overlay with data-reduced-motion for CSS + test introspection", () => {
    motionMocks.useReducedMotion.mockReturnValue(true);
    render(<GalleryZoomLightbox {...defaults} open onClose={() => {}} />);
    expect(screen.getByRole("dialog").getAttribute("data-reduced-motion")).toBe(
      "1",
    );
  });
});

describe("GalleryZoomLightbox — reset on reopen", () => {
  it("returns to initialIndex when reopened after a navigation", () => {
    const { rerender } = render(
      <GalleryZoomLightbox {...defaults} open onClose={() => {}} />,
    );
    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(
      (screen.getByTestId("gallery-zoom-image") as HTMLImageElement).src,
    ).toBe("https://img/b.jpg");
    act(() => {
      rerender(
        <GalleryZoomLightbox {...defaults} open={false} onClose={() => {}} />,
      );
    });
    act(() => {
      rerender(<GalleryZoomLightbox {...defaults} open onClose={() => {}} />);
    });
    expect(
      (screen.getByTestId("gallery-zoom-image") as HTMLImageElement).src,
    ).toBe("https://img/a.jpg");
  });
});
