import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

  it("shows the dialog after 8 seconds", async () => {
    render(<EmailCapturePopup />);
    expect(screen.queryByRole("dialog")).toBeNull();
    await act(async () => { vi.advanceTimersByTime(8_000); });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Stay in the loop")).toBeInTheDocument();
  });

  it("shows the dialog after 50% scroll depth", async () => {
    render(<EmailCapturePopup />);
    await act(async () => {
      // scrollY / (scrollHeight - innerHeight) = 600 / 1200 = 0.5
      Object.defineProperty(window, "scrollY", { value: 600, writable: true, configurable: true });
      Object.defineProperty(document.body, "scrollHeight", { value: 2000, writable: true, configurable: true });
      Object.defineProperty(window, "innerHeight", { value: 800, writable: true, configurable: true });
      fireEvent.scroll(window);
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("dismisses when the X button is clicked", async () => {
    render(<EmailCapturePopup />);
    await act(async () => { vi.advanceTimersByTime(8_000); });
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("sets localStorage flag on dismiss so popup does not re-show", async () => {
    render(<EmailCapturePopup />);
    await act(async () => { vi.advanceTimersByTime(8_000); });
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(lsMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, "1");
  });

  it("never shows when localStorage flag is already set", async () => {
    lsMock.getItem.mockReturnValue("1");
    render(<EmailCapturePopup />);
    await act(async () => { vi.advanceTimersByTime(8_000); });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("logs email to console and dismisses on form submit", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    render(<EmailCapturePopup />);
    await act(async () => { vi.advanceTimersByTime(8_000); });

    const input = screen.getByRole("textbox", { name: /email address/i });
    fireEvent.change(input, { target: { value: "test@example.com" } });
    fireEvent.submit(screen.getByRole("form", { name: /email signup/i }));

    expect(logSpy).toHaveBeenCalledWith("[EmailCapture] email captured:", "test@example.com");
    expect(screen.queryByRole("dialog")).toBeNull();
    logSpy.mockRestore();
  });

  it("renders headline, email input, CTA button, and close button", async () => {
    render(<EmailCapturePopup />);
    await act(async () => { vi.advanceTimersByTime(8_000); });
    expect(screen.getByRole("heading", { name: "Stay in the loop" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /email address/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign me up/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
  });
});
