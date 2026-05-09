import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

import { EmailCapturePopup } from "@/components/site/EmailCapturePopup";

const STORAGE_KEY = "cf-email-popup-dismissed";

// --- localStorage mock ---
const lsMock = (() => {
  let store: Record<string, string> = {};
  const impl = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
  const fns = {
    getItem: vi.fn(impl.getItem),
    setItem: vi.fn(impl.setItem),
    removeItem: vi.fn(impl.removeItem),
    clear() {
      store = {};
      // mockReset + restore base impl so mockReturnValue from prior tests doesn't leak
      fns.getItem.mockReset().mockImplementation(impl.getItem);
      fns.setItem.mockReset().mockImplementation(impl.setItem);
      fns.removeItem.mockReset().mockImplementation(impl.removeItem);
    },
  };
  return fns;
})();

beforeEach(() => {
  vi.useFakeTimers();
  lsMock.clear();
  Object.defineProperty(window, "localStorage", { value: lsMock, writable: true, configurable: true });
  Object.defineProperty(window, "scrollY", { value: 0, writable: true, configurable: true });
  Object.defineProperty(document.body, "scrollHeight", { value: 2000, writable: true, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: 800, writable: true, configurable: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("EmailCapturePopup", () => {
  it("renders nothing initially", () => {
    const { container } = render(<EmailCapturePopup />);
    expect(container.firstChild).toBeNull();
  });

  it("does NOT show the dialog on mount, even after a long delay (cfw-l93)", async () => {
    // Old behaviour fired the popup 8s after mount regardless of scroll;
    // surfaced as a hero-occlusion regression on mobile (cfw-y2i.1).
    render(<EmailCapturePopup />);
    expect(screen.queryByRole("dialog")).toBeNull();
    await act(async () => { vi.advanceTimersByTime(60_000); });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does NOT show the dialog while the user is still on the hero", async () => {
    render(<EmailCapturePopup />);
    await act(async () => {
      // Half a viewport scrolled — still inside the hero region.
      Object.defineProperty(window, "scrollY", { value: 400, writable: true, configurable: true });
      Object.defineProperty(window, "innerHeight", { value: 800, writable: true, configurable: true });
      fireEvent.scroll(window);
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows the dialog once the user has scrolled past one full viewport (engaged with the page)", async () => {
    render(<EmailCapturePopup />);
    await act(async () => {
      // 1 full viewport height scrolled = hero has been seen and scrolled past.
      Object.defineProperty(window, "scrollY", { value: 800, writable: true, configurable: true });
      Object.defineProperty(window, "innerHeight", { value: 800, writable: true, configurable: true });
      fireEvent.scroll(window);
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Stay in the loop")).toBeInTheDocument();
  });

  // Helper — fire the engaged-scroll event so the popup opens.
  async function engageAndOpen() {
    await act(async () => {
      Object.defineProperty(window, "scrollY", { value: 800, writable: true, configurable: true });
      Object.defineProperty(window, "innerHeight", { value: 800, writable: true, configurable: true });
      fireEvent.scroll(window);
    });
  }

  it("dismisses when the X button is clicked", async () => {
    render(<EmailCapturePopup />);
    await engageAndOpen();
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("sets localStorage flag on dismiss so popup does not re-show", async () => {
    render(<EmailCapturePopup />);
    await engageAndOpen();
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(lsMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, "1");
  });

  it("never shows when localStorage flag is already set", async () => {
    lsMock.getItem.mockReturnValue("1");
    render(<EmailCapturePopup />);
    await engageAndOpen();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("logs email to console and dismisses on form submit", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    render(<EmailCapturePopup />);
    await engageAndOpen();

    const input = screen.getByRole("textbox", { name: /email address/i });
    fireEvent.change(input, { target: { value: "test@example.com" } });
    fireEvent.submit(screen.getByRole("form", { name: /email signup/i }));

    expect(logSpy).toHaveBeenCalledWith("[EmailCapture] email captured:", "test@example.com");
    expect(screen.queryByRole("dialog")).toBeNull();
    logSpy.mockRestore();
  });

  it("renders headline, email input, CTA button, and close button", async () => {
    render(<EmailCapturePopup />);
    await engageAndOpen();
    expect(screen.getByRole("heading", { name: "Stay in the loop" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /email address/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign me up/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
  });
});
