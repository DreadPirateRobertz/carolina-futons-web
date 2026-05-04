import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { SaleLightbox } from "@/components/site/SaleLightbox";

vi.mock("@/components/site/NewsletterSignup", () => ({
  NewsletterSignup: () => <form data-testid="newsletter-form" />,
}));

const mockWriteText = vi.fn<[string], Promise<void>>().mockResolvedValue(undefined);

beforeEach(() => {
  localStorage.clear();
  mockWriteText.mockClear();
  Object.defineProperty(navigator, "clipboard", {
    writable: true,
    configurable: true,
    value: { writeText: mockWriteText },
  });
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

function openLightbox() {
  vi.useFakeTimers();
  render(<SaleLightbox />);
  act(() => vi.advanceTimersByTime(3500));
}

describe("SaleLightbox", () => {
  describe("visibility gate", () => {
    it("is hidden before the 3 s delay fires", () => {
      vi.useFakeTimers();
      render(<SaleLightbox />);
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("appears after the delay", () => {
      openLightbox();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("stays hidden when navigator.webdriver is true", () => {
      Object.defineProperty(navigator, "webdriver", {
        writable: true,
        configurable: true,
        value: true,
      });
      vi.useFakeTimers();
      render(<SaleLightbox />);
      act(() => vi.advanceTimersByTime(3500));
      expect(screen.queryByRole("dialog")).toBeNull();
      Object.defineProperty(navigator, "webdriver", {
        writable: true,
        configurable: true,
        value: undefined,
      });
    });

    it("stays hidden when dismissed within the last 24 h", () => {
      localStorage.setItem("cf-promo-dismissed", String(Date.now() - 1000));
      vi.useFakeTimers();
      render(<SaleLightbox />);
      act(() => vi.advanceTimersByTime(3500));
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  describe("promo code chip", () => {
    it("displays the promo code", () => {
      openLightbox();
      expect(screen.getByTestId("promo-code")).toHaveTextContent("SPRING25");
    });

    it("clicking copy calls clipboard.writeText with the promo code", () => {
      openLightbox();
      fireEvent.click(screen.getByTestId("copy-promo-code"));
      expect(mockWriteText).toHaveBeenCalledWith("SPRING25");
    });

    it("copy button shows 'Copied!' immediately after click", () => {
      openLightbox();
      fireEvent.click(screen.getByTestId("copy-promo-code"));
      expect(screen.getByTestId("copy-promo-code")).toHaveTextContent("Copied!");
    });

    it("copy button reverts to 'Copy' after 2 s", () => {
      openLightbox();
      fireEvent.click(screen.getByTestId("copy-promo-code"));
      act(() => vi.advanceTimersByTime(2001));
      expect(screen.getByTestId("copy-promo-code")).toHaveTextContent("Copy");
    });
  });

  describe("email capture", () => {
    it("renders the email capture section", () => {
      openLightbox();
      expect(screen.getByTestId("email-capture")).toBeInTheDocument();
    });

    it("renders the NewsletterSignup form inside the capture section", () => {
      openLightbox();
      const capture = screen.getByTestId("email-capture");
      expect(capture.querySelector("[data-testid='newsletter-form']")).toBeInTheDocument();
    });
  });

  describe("featured sale products", () => {
    it("renders Kingston Futon Frame with correct href", () => {
      openLightbox();
      expect(
        screen.getByRole("link", { name: /kingston futon frame/i }),
      ).toHaveAttribute("href", "/products/kingston-futon-frame");
    });

    it("renders Mesa Foam Mattress with correct href", () => {
      openLightbox();
      expect(
        screen.getByRole("link", { name: /mesa foam mattress/i }),
      ).toHaveAttribute("href", "/products/mesa-foam-mattress");
    });

    it("renders Sedona Futon Frame with correct href", () => {
      openLightbox();
      expect(
        screen.getByRole("link", { name: /sedona futon frame/i }),
      ).toHaveAttribute("href", "/products/sedona-futon-frame");
    });
  });

  describe("dismiss", () => {
    it("closes the dialog when the X button is clicked", () => {
      openLightbox();
      fireEvent.click(screen.getByRole("button", { name: /close sale popup/i }));
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("writes a dismiss timestamp to localStorage", () => {
      openLightbox();
      fireEvent.click(screen.getByRole("button", { name: /close sale popup/i }));
      const stored = localStorage.getItem("cf-promo-dismissed");
      expect(stored).not.toBeNull();
      expect(Number(stored)).toBeGreaterThan(0);
    });

    it("closes when the backdrop is clicked", () => {
      openLightbox();
      const backdrop = screen.getByRole("dialog").children[0] as HTMLElement;
      fireEvent.click(backdrop);
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });
});
