import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const actionMocks = vi.hoisted(() => ({
  setConsentChoice: vi.fn(),
}));

vi.mock("@/app/actions/consent", () => ({
  setConsentChoice: actionMocks.setConsentChoice,
}));

import { ConsentBanner } from "@/components/analytics/ConsentBanner";

let gtagSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  actionMocks.setConsentChoice.mockReset();
  actionMocks.setConsentChoice.mockResolvedValue({ ok: true });
  gtagSpy = vi.fn();
  (window as unknown as { gtag: typeof gtagSpy }).gtag = gtagSpy;
});

afterEach(() => {
  delete (window as unknown as { gtag?: unknown }).gtag;
});

describe("<ConsentBanner />", () => {
  it("renders nothing when initialChoice is 'granted'", () => {
    const { container } = render(<ConsentBanner initialChoice="granted" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when initialChoice is 'denied'", () => {
    const { container } = render(<ConsentBanner initialChoice="denied" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the banner with Accept / Reject / Manage when initialChoice is 'unknown'", async () => {
    render(<ConsentBanner initialChoice="unknown" />);
    expect(
      await screen.findByRole("region", { name: /privacy preferences/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /accept all/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reject all/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /manage preferences/i }).getAttribute("href"),
    ).toBe("/privacy");
  });

  it("on Accept All: calls setConsentChoice('granted'), emits gtag consent update, hides banner", async () => {
    render(<ConsentBanner initialChoice="unknown" />);
    fireEvent.click(await screen.findByRole("button", { name: /accept all/i }));
    await waitFor(() => {
      expect(actionMocks.setConsentChoice).toHaveBeenCalledWith("granted");
    });
    expect(gtagSpy).toHaveBeenCalledWith("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
    });
    await waitFor(() => {
      expect(
        screen.queryByRole("region", { name: /privacy preferences/i }),
      ).toBeNull();
    });
  });

  it("on Reject All: calls setConsentChoice('denied'), emits gtag consent update with denied map, hides banner", async () => {
    render(<ConsentBanner initialChoice="unknown" />);
    fireEvent.click(await screen.findByRole("button", { name: /reject all/i }));
    await waitFor(() => {
      expect(actionMocks.setConsentChoice).toHaveBeenCalledWith("denied");
    });
    expect(gtagSpy).toHaveBeenCalledWith("consent", "update", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    await waitFor(() => {
      expect(
        screen.queryByRole("region", { name: /privacy preferences/i }),
      ).toBeNull();
    });
  });

  it("does not call setConsentChoice or gtag when the action returns ok:false", async () => {
    actionMocks.setConsentChoice.mockResolvedValueOnce({ ok: false });
    render(<ConsentBanner initialChoice="unknown" />);
    fireEvent.click(await screen.findByRole("button", { name: /accept all/i }));
    await waitFor(() => {
      expect(actionMocks.setConsentChoice).toHaveBeenCalled();
    });
    expect(gtagSpy).not.toHaveBeenCalled();
    // Banner stays visible since the choice didn't persist.
    expect(
      screen.getByRole("region", { name: /privacy preferences/i }),
    ).toBeInTheDocument();
  });

  it("safely no-ops the gtag update when window.gtag is missing", async () => {
    delete (window as unknown as { gtag?: unknown }).gtag;
    render(<ConsentBanner initialChoice="unknown" />);
    fireEvent.click(await screen.findByRole("button", { name: /accept all/i }));
    await waitFor(() => {
      expect(actionMocks.setConsentChoice).toHaveBeenCalled();
    });
    // No throw, no banner.
    await waitFor(() => {
      expect(
        screen.queryByRole("region", { name: /privacy preferences/i }),
      ).toBeNull();
    });
  });
});
