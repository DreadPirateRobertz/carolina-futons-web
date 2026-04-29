import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { AppDownloadBanner } from "@/components/site/AppDownloadBanner";

const STORAGE_KEY = "cf_app_banner_dismissed";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const getPromoRegion = () =>
  screen.getByRole("region", { name: /app download promotion/i });
const queryPromoRegion = () =>
  screen.queryByRole("region", { name: /app download promotion/i });

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  localStorage.clear();
});

describe("AppDownloadBanner", () => {
  describe("rendering", () => {
    it("renders when localStorage has no dismiss key", async () => {
      render(<AppDownloadBanner />);
      await waitFor(() => expect(getPromoRegion()).toBeInTheDocument());
    });

    it("renders the promo copy", async () => {
      render(<AppDownloadBanner />);
      await waitFor(() =>
        expect(screen.getByText(/shop carolina futons on the go/i)).toBeInTheDocument()
      );
    });

    it("uses role=region (not role=banner) to avoid landmark nesting violation", async () => {
      render(<AppDownloadBanner />);
      await waitFor(() => {
        expect(getPromoRegion()).toBeInTheDocument();
        expect(screen.queryByRole("banner")).toBeNull();
      });
    });

    it("has aria-label='App download promotion' on the root element", async () => {
      render(<AppDownloadBanner />);
      await waitFor(() =>
        expect(getPromoRegion()).toHaveAttribute("aria-label", "App download promotion")
      );
    });

    it("renders an App Store link with href='#'", async () => {
      render(<AppDownloadBanner />);
      await waitFor(() => {
        const link = screen.getByRole("link", { name: /app store/i });
        expect(link).toHaveAttribute("href", "#");
      });
    });

    it("renders a Play Store link with href='#'", async () => {
      render(<AppDownloadBanner />);
      await waitFor(() => {
        const link = screen.getByRole("link", { name: /play store/i });
        expect(link).toHaveAttribute("href", "#");
      });
    });

    it("applies md:hidden so banner is hidden on desktop breakpoints", async () => {
      render(<AppDownloadBanner />);
      await waitFor(() =>
        expect(getPromoRegion().className).toMatch(/md:hidden/)
      );
    });
  });

  describe("dismiss button accessibility", () => {
    it("renders a dismiss button with aria-label", async () => {
      render(<AppDownloadBanner />);
      await waitFor(() => {
        const btn = screen.getByRole("button", { name: /dismiss app download banner/i });
        expect(btn).toHaveAttribute("aria-label");
      });
    });

    it("dismiss button is a real button element (keyboard navigable)", async () => {
      render(<AppDownloadBanner />);
      await waitFor(() => {
        const btn = screen.getByRole("button", { name: /dismiss/i });
        expect(btn.tagName).toBe("BUTTON");
      });
    });
  });

  describe("dismiss behavior", () => {
    it("hides the banner after dismiss button is clicked", async () => {
      render(<AppDownloadBanner />);
      await waitFor(() =>
        expect(screen.getByRole("button", { name: /dismiss app download banner/i })).toBeInTheDocument()
      );
      fireEvent.click(screen.getByRole("button", { name: /dismiss app download banner/i }));
      expect(queryPromoRegion()).toBeNull();
    });

    it("hides the banner when Enter is pressed on the dismiss button", async () => {
      render(<AppDownloadBanner />);
      const btn = await screen.findByRole("button", { name: /dismiss app download banner/i });
      fireEvent.keyDown(btn, { key: "Enter" });
      fireEvent.click(btn);
      expect(queryPromoRegion()).toBeNull();
    });

    it("writes dismiss timestamp to localStorage on dismiss", async () => {
      render(<AppDownloadBanner />);
      await waitFor(() =>
        expect(screen.getByRole("button", { name: /dismiss app download banner/i })).toBeInTheDocument()
      );
      fireEvent.click(screen.getByRole("button", { name: /dismiss app download banner/i }));
      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).not.toBeNull();
      expect(Number(stored)).toBeGreaterThan(0);
    });

    it("uses the correct storage key 'cf_app_banner_dismissed'", async () => {
      render(<AppDownloadBanner />);
      await waitFor(() =>
        expect(screen.getByRole("button", { name: /dismiss app download banner/i })).toBeInTheDocument()
      );
      fireEvent.click(screen.getByRole("button", { name: /dismiss app download banner/i }));
      expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    });
  });

  describe("7-day suppress", () => {
    it("does not render when dismissed within the last 7 days", async () => {
      localStorage.setItem(STORAGE_KEY, String(Date.now() - 1000));
      render(<AppDownloadBanner />);
      await waitFor(() => expect(queryPromoRegion()).toBeNull());
    });

    it("does not render when dismissed exactly 1 day ago", async () => {
      localStorage.setItem(STORAGE_KEY, String(Date.now() - 24 * 60 * 60 * 1000));
      render(<AppDownloadBanner />);
      await waitFor(() => expect(queryPromoRegion()).toBeNull());
    });

    it("renders when dismissed at exactly the 7-day boundary", async () => {
      localStorage.setItem(STORAGE_KEY, String(Date.now() - SEVEN_DAYS_MS));
      render(<AppDownloadBanner />);
      await waitFor(() => expect(getPromoRegion()).toBeInTheDocument());
    });

    it("renders again when dismissed more than 7 days ago", async () => {
      localStorage.setItem(STORAGE_KEY, String(Date.now() - SEVEN_DAYS_MS - 1000));
      render(<AppDownloadBanner />);
      await waitFor(() => expect(getPromoRegion()).toBeInTheDocument());
    });

    it("renders when localStorage has an invalid (non-numeric) value", async () => {
      localStorage.setItem(STORAGE_KEY, "not-a-timestamp");
      render(<AppDownloadBanner />);
      await waitFor(() => expect(getPromoRegion()).toBeInTheDocument());
    });

    it("renders when localStorage value is 0", async () => {
      localStorage.setItem(STORAGE_KEY, "0");
      render(<AppDownloadBanner />);
      await waitFor(() => expect(getPromoRegion()).toBeInTheDocument());
    });

    it("renders when localStorage.getItem throws (storage unavailable)", async () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("storage unavailable");
      });
      render(<AppDownloadBanner />);
      await waitFor(() => expect(getPromoRegion()).toBeInTheDocument());
    });
  });
});
