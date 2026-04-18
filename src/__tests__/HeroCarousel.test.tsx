import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HeroCarousel, type HeroSlide } from "@/components/site/HeroCarousel";

// ── Test fixtures ─────────────────────────────────────────────────────────────

const SLIDES: HeroSlide[] = [
  { src: "/brand/slide-1.jpg", alt: "Futon in a sunlit living room" },
  { src: "/brand/slide-2.jpg", alt: "Platform bed in a coastal bedroom" },
  { src: "/brand/slide-3.jpg", alt: "Murphy bed in a home office" },
];

const ONE_SLIDE: HeroSlide[] = [
  { src: "/brand/slide-1.jpg", alt: "Single hero image" },
];

// ── matchMedia helpers ────────────────────────────────────────────────────────

function mockMatchMedia(reducedMotion: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches:
        query === "(prefers-reduced-motion: reduce)" ? reducedMotion : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

function renderCarousel(slides = SLIDES) {
  return render(<HeroCarousel slides={slides} />);
}

// ── Describe blocks ───────────────────────────────────────────────────────────

describe("HeroCarousel — rendering", () => {
  beforeEach(() => mockMatchMedia(false));

  it("renders a region with role and label", () => {
    renderCarousel();
    expect(
      screen.getByRole("region", { name: /hero image carousel/i }),
    ).toBeInTheDocument();
  });

  it("renders all slides in the DOM", () => {
    renderCarousel();
    expect(screen.getByAltText(SLIDES[0].alt)).toBeInTheDocument();
    expect(screen.getByAltText(SLIDES[1].alt)).toBeInTheDocument();
    expect(screen.getByAltText(SLIDES[2].alt)).toBeInTheDocument();
  });

  it("first slide is visible (opacity-100) on initial render", () => {
    const { container } = renderCarousel();
    const slideWrappers = container.querySelectorAll(
      "[aria-roledescription='slide']",
    );
    expect(slideWrappers[0].className).toContain("opacity-100");
    expect(slideWrappers[1].className).toContain("opacity-0");
    expect(slideWrappers[2].className).toContain("opacity-0");
  });

  it("non-active slides have aria-hidden=true", () => {
    const { container } = renderCarousel();
    const slides = container.querySelectorAll("[aria-roledescription='slide']");
    expect(slides[0]).toHaveAttribute("aria-hidden", "false");
    expect(slides[1]).toHaveAttribute("aria-hidden", "true");
    expect(slides[2]).toHaveAttribute("aria-hidden", "true");
  });

  it("renders dot buttons for each slide", () => {
    renderCarousel();
    const dots = screen.getAllByRole("tab");
    expect(dots).toHaveLength(SLIDES.length);
  });

  it("first dot is selected (aria-selected=true)", () => {
    renderCarousel();
    const dots = screen.getAllByRole("tab");
    expect(dots[0]).toHaveAttribute("aria-selected", "true");
    expect(dots[1]).toHaveAttribute("aria-selected", "false");
    expect(dots[2]).toHaveAttribute("aria-selected", "false");
  });

  it("dot buttons have accessible labels including slide alt text", () => {
    renderCarousel();
    expect(
      screen.getByRole("tab", { name: /go to slide 1/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /go to slide 2/i }),
    ).toBeInTheDocument();
  });
});

describe("HeroCarousel — autoplay timer", () => {
  beforeEach(() => {
    mockMatchMedia(false);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("data-autoplay is 'true' when playing", () => {
    renderCarousel();
    expect(screen.getByTestId("hero-carousel")).toHaveAttribute(
      "data-autoplay",
      "true",
    );
  });

  it("advances to slide 2 after 5 s", () => {
    const { container } = renderCarousel();
    act(() => vi.advanceTimersByTime(5000));
    const slides = container.querySelectorAll("[aria-roledescription='slide']");
    expect(slides[1].className).toContain("opacity-100");
    expect(slides[0].className).toContain("opacity-0");
  });

  it("advances to slide 3 after 10 s", () => {
    const { container } = renderCarousel();
    act(() => vi.advanceTimersByTime(10000));
    const slides = container.querySelectorAll("[aria-roledescription='slide']");
    expect(slides[2].className).toContain("opacity-100");
  });

  it("wraps back to slide 1 after 15 s (3-slide cycle)", () => {
    const { container } = renderCarousel();
    act(() => vi.advanceTimersByTime(15000));
    const slides = container.querySelectorAll("[aria-roledescription='slide']");
    expect(slides[0].className).toContain("opacity-100");
  });

  it("does NOT autoplay with a single slide", () => {
    renderCarousel(ONE_SLIDE);
    expect(screen.getByTestId("hero-carousel")).toHaveAttribute(
      "data-autoplay",
      "false",
    );
  });
});

describe("HeroCarousel — pause on hover", () => {
  beforeEach(() => {
    mockMatchMedia(false);
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("mouseenter pauses autoplay", () => {
    renderCarousel();
    const carousel = screen.getByTestId("hero-carousel");
    fireEvent.mouseEnter(carousel);
    expect(carousel).toHaveAttribute("data-autoplay", "false");
  });

  it("slide does NOT advance while hovered", () => {
    const { container } = renderCarousel();
    const carousel = screen.getByTestId("hero-carousel");
    fireEvent.mouseEnter(carousel);
    act(() => vi.advanceTimersByTime(5000));
    const slides = container.querySelectorAll("[aria-roledescription='slide']");
    // Still on slide 1
    expect(slides[0].className).toContain("opacity-100");
  });

  it("mouseleave resumes autoplay", () => {
    renderCarousel();
    const carousel = screen.getByTestId("hero-carousel");
    fireEvent.mouseEnter(carousel);
    fireEvent.mouseLeave(carousel);
    expect(carousel).toHaveAttribute("data-autoplay", "true");
  });

  it("resumes and advances after mouseleave", () => {
    const { container } = renderCarousel();
    const carousel = screen.getByTestId("hero-carousel");
    fireEvent.mouseEnter(carousel);
    act(() => vi.advanceTimersByTime(8000));
    fireEvent.mouseLeave(carousel);
    act(() => vi.advanceTimersByTime(5000));
    const slides = container.querySelectorAll("[aria-roledescription='slide']");
    expect(slides[1].className).toContain("opacity-100");
  });
});

describe("HeroCarousel — pause on focus-within", () => {
  beforeEach(() => {
    mockMatchMedia(false);
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("focus on the carousel region pauses autoplay", () => {
    renderCarousel();
    const carousel = screen.getByTestId("hero-carousel");
    fireEvent.focus(carousel);
    expect(carousel).toHaveAttribute("data-autoplay", "false");
  });

  it("focus on a dot button pauses autoplay", async () => {
    renderCarousel();
    const dot = screen.getAllByRole("tab")[0];
    fireEvent.focus(dot);
    expect(screen.getByTestId("hero-carousel")).toHaveAttribute(
      "data-autoplay",
      "false",
    );
  });

  it("blur restores autoplay when focus leaves the region", () => {
    renderCarousel();
    const carousel = screen.getByTestId("hero-carousel");
    fireEvent.focus(carousel);
    // relatedTarget=null means focus left the region entirely
    fireEvent.blur(carousel, { relatedTarget: null });
    expect(carousel).toHaveAttribute("data-autoplay", "true");
  });
});

describe("HeroCarousel — keyboard navigation", () => {
  beforeEach(() => mockMatchMedia(false));

  it("ArrowRight advances to next slide", () => {
    const { container } = renderCarousel();
    const carousel = screen.getByTestId("hero-carousel");
    fireEvent.keyDown(carousel, { key: "ArrowRight" });
    const slides = container.querySelectorAll("[aria-roledescription='slide']");
    expect(slides[1].className).toContain("opacity-100");
    expect(slides[0].className).toContain("opacity-0");
  });

  it("ArrowLeft goes to previous slide (wraps to last)", () => {
    const { container } = renderCarousel();
    const carousel = screen.getByTestId("hero-carousel");
    fireEvent.keyDown(carousel, { key: "ArrowLeft" });
    const slides = container.querySelectorAll("[aria-roledescription='slide']");
    // Slide 1 → ArrowLeft wraps to slide 3 (index 2)
    expect(slides[2].className).toContain("opacity-100");
  });

  it("ArrowRight from last slide wraps to first", () => {
    const { container } = renderCarousel();
    const carousel = screen.getByTestId("hero-carousel");
    // Advance to last slide
    fireEvent.keyDown(carousel, { key: "ArrowRight" });
    fireEvent.keyDown(carousel, { key: "ArrowRight" });
    fireEvent.keyDown(carousel, { key: "ArrowRight" });
    const slides = container.querySelectorAll("[aria-roledescription='slide']");
    expect(slides[0].className).toContain("opacity-100");
  });

  it("updates dot aria-selected on keyboard nav", () => {
    renderCarousel();
    const carousel = screen.getByTestId("hero-carousel");
    fireEvent.keyDown(carousel, { key: "ArrowRight" });
    const dots = screen.getAllByRole("tab");
    expect(dots[1]).toHaveAttribute("aria-selected", "true");
    expect(dots[0]).toHaveAttribute("aria-selected", "false");
  });
});

describe("HeroCarousel — dot navigation", () => {
  beforeEach(() => mockMatchMedia(false));

  it("clicking dot 2 activates slide 2", async () => {
    const { container } = renderCarousel();
    const dots = screen.getAllByRole("tab");
    await userEvent.click(dots[1]);
    const slides = container.querySelectorAll("[aria-roledescription='slide']");
    expect(slides[1].className).toContain("opacity-100");
  });

  it("clicking dot 3 activates slide 3", async () => {
    const { container } = renderCarousel();
    const dots = screen.getAllByRole("tab");
    await userEvent.click(dots[2]);
    const slides = container.querySelectorAll("[aria-roledescription='slide']");
    expect(slides[2].className).toContain("opacity-100");
  });

  it("clicking active dot does not change slide", async () => {
    const { container } = renderCarousel();
    const dots = screen.getAllByRole("tab");
    await userEvent.click(dots[0]);
    const slides = container.querySelectorAll("[aria-roledescription='slide']");
    expect(slides[0].className).toContain("opacity-100");
  });
});

describe("HeroCarousel — combined pause state", () => {
  beforeEach(() => {
    mockMatchMedia(false);
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("hover + focus both active: removing hover keeps autoplay paused", () => {
    renderCarousel();
    const carousel = screen.getByTestId("hero-carousel");
    fireEvent.mouseEnter(carousel);
    fireEvent.focus(carousel);
    fireEvent.mouseLeave(carousel);
    expect(carousel).toHaveAttribute("data-autoplay", "false");
  });

  it("focus + hover both active: removing focus keeps autoplay paused", () => {
    renderCarousel();
    const carousel = screen.getByTestId("hero-carousel");
    fireEvent.focus(carousel);
    fireEvent.mouseEnter(carousel);
    fireEvent.blur(carousel, { relatedTarget: null });
    expect(carousel).toHaveAttribute("data-autoplay", "false");
  });
});

describe("HeroCarousel — blur intra-region", () => {
  beforeEach(() => {
    mockMatchMedia(false);
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("blur with relatedTarget still inside carousel does not resume autoplay", () => {
    const { container } = renderCarousel();
    const carousel = screen.getByTestId("hero-carousel");
    fireEvent.focus(carousel);
    // relatedTarget is a dot button inside the carousel — intra-region tab
    const dot = container.querySelector("[role='tab']") as Element;
    fireEvent.blur(carousel, { relatedTarget: dot });
    expect(carousel).toHaveAttribute("data-autoplay", "false");
  });
});

describe("HeroCarousel — dot styling", () => {
  beforeEach(() => mockMatchMedia(false));

  it("active dot has bg-cf-cta class, inactive dots do not", () => {
    renderCarousel();
    const dots = screen.getAllByRole("tab");
    expect(dots[0].className).toContain("bg-cf-cta");
    expect(dots[1].className).not.toContain("bg-cf-cta");
    expect(dots[2].className).not.toContain("bg-cf-cta");
  });

  it("clicking dot 2 moves bg-cf-cta to dot 2", async () => {
    renderCarousel();
    const dots = screen.getAllByRole("tab");
    await userEvent.click(dots[1]);
    expect(dots[1].className).toContain("bg-cf-cta");
    expect(dots[0].className).not.toContain("bg-cf-cta");
  });
});

describe("HeroCarousel — reduced motion", () => {
  afterEach(() => vi.useRealTimers());

  it("autoplay is disabled when prefers-reduced-motion: reduce", () => {
    mockMatchMedia(true);
    vi.useFakeTimers();
    renderCarousel();
    expect(screen.getByTestId("hero-carousel")).toHaveAttribute(
      "data-autoplay",
      "false",
    );
  });

  it("slide does NOT advance with timer under reduced motion", () => {
    mockMatchMedia(true);
    vi.useFakeTimers();
    const { container } = renderCarousel();
    act(() => vi.advanceTimersByTime(15000));
    const slides = container.querySelectorAll("[aria-roledescription='slide']");
    expect(slides[0].className).toContain("opacity-100");
  });

  it("keyboard nav still works under reduced motion", () => {
    mockMatchMedia(true);
    const { container } = renderCarousel();
    fireEvent.keyDown(screen.getByTestId("hero-carousel"), { key: "ArrowRight" });
    const slides = container.querySelectorAll("[aria-roledescription='slide']");
    expect(slides[1].className).toContain("opacity-100");
  });

  it("dots still navigate under reduced motion", async () => {
    mockMatchMedia(true);
    const { container } = renderCarousel();
    await userEvent.click(screen.getAllByRole("tab")[2]);
    const slides = container.querySelectorAll("[aria-roledescription='slide']");
    expect(slides[2].className).toContain("opacity-100");
  });

  it("crossfade duration class is absent under reduced motion", () => {
    mockMatchMedia(true);
    const { container } = renderCarousel();
    const slideWrapper = container.querySelector("[aria-roledescription='slide']");
    expect(slideWrapper?.getAttribute("class")).not.toContain("duration-700");
  });

  it("crossfade duration-700 is present without reduced motion", () => {
    mockMatchMedia(false);
    const { container } = renderCarousel();
    const slideWrapper = container.querySelector("[aria-roledescription='slide']");
    expect(slideWrapper?.getAttribute("class")).toContain("duration-700");
  });

  it("matchMedia change event updates reduced-motion state", () => {
    let capturedHandler: ((e: MediaQueryListEvent) => void) | null = null;
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn((_event: string, handler: (e: MediaQueryListEvent) => void) => {
          if (query === "(prefers-reduced-motion: reduce)") capturedHandler = handler;
        }),
        removeEventListener: vi.fn(),
      })),
    });

    vi.useFakeTimers();
    renderCarousel();
    expect(screen.getByTestId("hero-carousel")).toHaveAttribute("data-autoplay", "true");

    act(() => {
      capturedHandler?.({ matches: true } as MediaQueryListEvent);
    });
    expect(screen.getByTestId("hero-carousel")).toHaveAttribute("data-autoplay", "false");
    vi.useRealTimers();
  });
});

// WCAG 2.2.2 (Pause, Stop, Hide) — always-visible pause/play control for
// auto-advancing content so keyboard and SR users can stop motion without
// relying on hover or focus. Rendered only when autoplay can be active
// (multi-slide, no reduced-motion OS preference). cf-p7-hero-carousel-pause.
describe("HeroCarousel — pause/play button", () => {
  beforeEach(() => {
    mockMatchMedia(false);
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("renders a pause button with accessible label", () => {
    renderCarousel();
    expect(
      screen.getByRole("button", { name: /pause slideshow/i }),
    ).toBeInTheDocument();
  });

  it("clicking the pause button stops autoplay", () => {
    renderCarousel();
    const pauseBtn = screen.getByRole("button", { name: /pause slideshow/i });
    fireEvent.click(pauseBtn);
    expect(screen.getByTestId("hero-carousel")).toHaveAttribute(
      "data-autoplay",
      "false",
    );
  });

  it("pause button label switches to Play slideshow after clicking pause", () => {
    renderCarousel();
    fireEvent.click(screen.getByRole("button", { name: /pause slideshow/i }));
    expect(
      screen.getByRole("button", { name: /play slideshow/i }),
    ).toBeInTheDocument();
  });

  it("clicking play button after pause resumes autoplay", () => {
    renderCarousel();
    fireEvent.click(screen.getByRole("button", { name: /pause slideshow/i }));
    fireEvent.click(screen.getByRole("button", { name: /play slideshow/i }));
    expect(screen.getByTestId("hero-carousel")).toHaveAttribute(
      "data-autoplay",
      "true",
    );
  });

  it("slide does NOT advance while manually paused", () => {
    const { container } = renderCarousel();
    fireEvent.click(screen.getByRole("button", { name: /pause slideshow/i }));
    act(() => vi.advanceTimersByTime(5000));
    const slides = container.querySelectorAll("[aria-roledescription='slide']");
    expect(slides[0].className).toContain("opacity-100");
  });

  it("pause button is absent when only one slide is provided", () => {
    renderCarousel(ONE_SLIDE);
    expect(
      screen.queryByRole("button", { name: /pause slideshow/i }),
    ).toBeNull();
  });

  it("pause button is absent when prefers-reduced-motion is set", () => {
    mockMatchMedia(true);
    renderCarousel();
    expect(
      screen.queryByRole("button", { name: /pause slideshow/i }),
    ).toBeNull();
  });
});
