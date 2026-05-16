import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";

const actionMocks = vi.hoisted(() => ({
  setConsentChoice: vi.fn(),
}));

vi.mock("@/app/actions/consent", () => ({
  setConsentChoice: actionMocks.setConsentChoice,
}));

import { ConsentBanner } from "@/components/analytics/ConsentBanner";

let gtagSpy: ReturnType<typeof vi.fn>;

function setConsentCookie(value: string | undefined) {
  // cf-0klm: ConsentBanner now reads document.cookie in its mount-only
  // useEffect (no initialChoice prop). Tests set the cookie before
  // render() to simulate each consent state.
  Object.defineProperty(document, "cookie", {
    writable: true,
    value: value === undefined ? "" : `cf_consent=${value}`,
  });
}

beforeEach(() => {
  actionMocks.setConsentChoice.mockReset();
  actionMocks.setConsentChoice.mockResolvedValue({ ok: true });
  gtagSpy = vi.fn();
  (window as unknown as { gtag: typeof gtagSpy }).gtag = gtagSpy;
  setConsentCookie(undefined);
});

afterEach(() => {
  cleanup();
  delete (window as unknown as { gtag?: unknown }).gtag;
  setConsentCookie(undefined);
});

describe("<ConsentBanner /> — cf-0klm self-contained (no initialChoice prop)", () => {
  it("renders nothing when cookie is 'granted'", async () => {
    setConsentCookie("granted");
    const { container } = render(<ConsentBanner />);
    // useEffect runs synchronously in jsdom; the mounted+choice flip
    // happens before the next assertion tick.
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("renders nothing when cookie is 'denied'", async () => {
    setConsentCookie("denied");
    const { container } = render(<ConsentBanner />);
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("renders the banner with Accept / Reject / Manage when no cookie is present (first-time visitor)", async () => {
    setConsentCookie(undefined);
    render(<ConsentBanner />);
    expect(
      await screen.findByRole("region", { name: /privacy preferences/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /accept all/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reject all/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /manage preferences/i }).getAttribute("href"),
    ).toBe("/privacy");
  });

  it("renders the banner when cookie is 'unknown'", async () => {
    setConsentCookie("unknown");
    render(<ConsentBanner />);
    expect(
      await screen.findByRole("region", { name: /privacy preferences/i }),
    ).toBeInTheDocument();
  });

  it("hides the banner when cookie is a valid JSON ConsentGrantMap (treated as granted)", async () => {
    const map = {
      analytics_storage: "granted",
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
    };
    setConsentCookie(encodeURIComponent(JSON.stringify(map)));
    const { container } = render(<ConsentBanner />);
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("on Accept All: calls setConsentChoice('granted'), emits gtag consent update, hides banner", async () => {
    render(<ConsentBanner />);
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
    render(<ConsentBanner />);
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
    render(<ConsentBanner />);
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
    render(<ConsentBanner />);
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
