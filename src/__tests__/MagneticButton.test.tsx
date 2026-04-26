import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MagneticButton } from "@/components/ui/MagneticButton";

// Stub matchMedia — jsdom does not implement it.
function stubMatchMedia(prefersReduced: boolean) {
  const listeners: (() => void)[] = [];
  const mq = {
    matches: prefersReduced,
    addEventListener: vi.fn((_: string, cb: () => void) => listeners.push(cb)),
    removeEventListener: vi.fn((_: string, cb: () => void) => {
      const i = listeners.indexOf(cb);
      if (i !== -1) listeners.splice(i, 1);
    }),
  };
  vi.stubGlobal("matchMedia", (query: string) => {
    if (query === "(prefers-reduced-motion: reduce)") return mq;
    return { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  });
  return mq;
}

const DID = "magnetic-wrapper";

beforeEach(() => {
  stubMatchMedia(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MagneticButton — rendering", () => {
  it("renders children", () => {
    render(<MagneticButton data-testid={DID}>Shop now</MagneticButton>);
    expect(screen.getByText("Shop now")).toBeInTheDocument();
  });

  it("forwards className to wrapper div", () => {
    render(<MagneticButton data-testid={DID} className="my-btn">Click</MagneticButton>);
    expect(screen.getByTestId(DID)).toHaveClass("my-btn");
  });

  it("renders as a div wrapper", () => {
    render(<MagneticButton data-testid={DID}>CTA</MagneticButton>);
    expect(screen.getByTestId(DID).tagName).toBe("DIV");
  });
});

describe("MagneticButton — mouse tracking", () => {
  it("applies translate style on mousemove", () => {
    render(<MagneticButton data-testid={DID}>Click</MagneticButton>);
    const wrapper = screen.getByTestId(DID);

    vi.spyOn(wrapper, "getBoundingClientRect").mockReturnValue({
      left: 100, top: 50, width: 120, height: 40,
      right: 220, bottom: 90, x: 100, y: 50, toJSON: () => ({}),
    });

    fireEvent.mouseMove(wrapper, { clientX: 170, clientY: 70 });

    expect(wrapper.style.transform).toMatch(/translate\(/);
    expect(wrapper.style.transform).not.toBe("translate(0px, 0px)");
  });

  it("resets translate to 0 on mouseleave", () => {
    render(<MagneticButton data-testid={DID}>Click</MagneticButton>);
    const wrapper = screen.getByTestId(DID);

    vi.spyOn(wrapper, "getBoundingClientRect").mockReturnValue({
      left: 100, top: 50, width: 120, height: 40,
      right: 220, bottom: 90, x: 100, y: 50, toJSON: () => ({}),
    });

    fireEvent.mouseMove(wrapper, { clientX: 170, clientY: 70 });
    fireEvent.mouseLeave(wrapper);

    expect(wrapper.style.transform).toBe("translate(0px, 0px)");
  });

  it("clamps translate to maxTranslate", () => {
    render(<MagneticButton data-testid={DID} maxTranslate={4} strength={1}>Click</MagneticButton>);
    const wrapper = screen.getByTestId(DID);

    vi.spyOn(wrapper, "getBoundingClientRect").mockReturnValue({
      left: 0, top: 0, width: 100, height: 40,
      right: 100, bottom: 40, x: 0, y: 0, toJSON: () => ({}),
    });

    // center=(50,20), cursor=(250,250) → dx=200, dy=230; both exceed maxTranslate=4.
    fireEvent.mouseMove(wrapper, { clientX: 250, clientY: 250 });
    expect(wrapper.style.transform).toBe("translate(4px, 4px)");
  });

  it("uses fast transition during move, slow spring-back on leave", () => {
    render(<MagneticButton data-testid={DID}>Click</MagneticButton>);
    const wrapper = screen.getByTestId(DID);

    vi.spyOn(wrapper, "getBoundingClientRect").mockReturnValue({
      left: 100, top: 50, width: 120, height: 40,
      right: 220, bottom: 90, x: 100, y: 50, toJSON: () => ({}),
    });

    fireEvent.mouseMove(wrapper, { clientX: 170, clientY: 70 });
    expect(wrapper.style.transition).toContain("0.08s");

    fireEvent.mouseLeave(wrapper);
    expect(wrapper.style.transition).toContain("0.35s");
  });
});

describe("MagneticButton — reduced motion", () => {
  it("applies no inline style when prefers-reduced-motion is set", () => {
    stubMatchMedia(true);
    render(<MagneticButton data-testid={DID}>Click</MagneticButton>);
    expect(screen.getByTestId(DID).getAttribute("style")).toBeNull();
  });

  it("does not update transform on mousemove when reduced-motion is set", () => {
    stubMatchMedia(true);
    render(<MagneticButton data-testid={DID}>Click</MagneticButton>);
    const wrapper = screen.getByTestId(DID);

    vi.spyOn(wrapper, "getBoundingClientRect").mockReturnValue({
      left: 100, top: 50, width: 120, height: 40,
      right: 220, bottom: 90, x: 100, y: 50, toJSON: () => ({}),
    });

    fireEvent.mouseMove(wrapper, { clientX: 170, clientY: 70 });
    expect(wrapper.getAttribute("style")).toBeNull();
  });

  it("removes matchMedia listener on unmount", () => {
    const mq = stubMatchMedia(false);
    const { unmount } = render(<MagneticButton data-testid={DID}>Click</MagneticButton>);
    unmount();
    expect(mq.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("disables animation when OS preference changes mid-session", () => {
    const listeners: (() => void)[] = [];
    const mq = {
      matches: false,
      addEventListener: vi.fn((_: string, cb: () => void) => listeners.push(cb)),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal("matchMedia", (query: string) => {
      if (query === "(prefers-reduced-motion: reduce)") return mq;
      return { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
    });

    render(<MagneticButton data-testid={DID}>Click</MagneticButton>);
    const wrapper = screen.getByTestId(DID);

    // Initially: style attribute is present (animations enabled).
    expect(wrapper.getAttribute("style")).not.toBeNull();

    // OS switches to reduce motion — fire the change callback.
    mq.matches = true;
    act(() => { listeners.forEach((cb) => cb()); });

    // After switching, mousemove must not apply a translate.
    vi.spyOn(wrapper, "getBoundingClientRect").mockReturnValue({
      left: 100, top: 50, width: 120, height: 40,
      right: 220, bottom: 90, x: 100, y: 50, toJSON: () => ({}),
    });
    fireEvent.mouseMove(wrapper, { clientX: 170, clientY: 70 });
    expect(wrapper.style.transform).toBe("");
  });
});
