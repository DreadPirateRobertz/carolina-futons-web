import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PwaInstallBanner } from "@/components/site/PwaInstallBanner";

const DISMISS_KEY = "cf-pwa-install-dismissed-at";

type PromptOutcome = "accepted" | "dismissed";

function makePromptEvent(outcome: PromptOutcome = "accepted") {
  const prompt = vi.fn().mockResolvedValue(undefined);
  const event = new Event("beforeinstallprompt") as Event & {
    prompt: typeof prompt;
    userChoice: Promise<{ outcome: PromptOutcome; platform: string }>;
    platforms: string[];
  };
  event.prompt = prompt;
  event.userChoice = Promise.resolve({ outcome, platform: "web" });
  Object.defineProperty(event, "platforms", { value: ["web"] });
  return { event, prompt };
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PwaInstallBanner", () => {
  it("renders nothing before beforeinstallprompt fires", () => {
    const { container } = render(<PwaInstallBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the install CTA after beforeinstallprompt fires", async () => {
    render(<PwaInstallBanner />);
    const { event } = makePromptEvent();
    await act(async () => {
      window.dispatchEvent(event);
    });
    expect(
      screen.getByRole("region", { name: /install carolina futons/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^install$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /not now/i })).toBeInTheDocument();
  });

  it("preventDefaults the event so Chrome doesn't show its own infobar", async () => {
    render(<PwaInstallBanner />);
    const { event } = makePromptEvent();
    const preventDefault = vi.spyOn(event, "preventDefault");
    await act(async () => {
      window.dispatchEvent(event);
    });
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it("calls deferredPrompt.prompt() when Install is clicked and hides the banner", async () => {
    render(<PwaInstallBanner />);
    const { event, prompt } = makePromptEvent("accepted");
    await act(async () => {
      window.dispatchEvent(event);
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /^install$/i }));
    expect(prompt).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(
        screen.queryByRole("region", { name: /install carolina futons/i }),
      ).toBeNull();
    });
  });

  it("persists dismissal when user picks 'Not now'", async () => {
    render(<PwaInstallBanner />);
    const { event } = makePromptEvent();
    await act(async () => {
      window.dispatchEvent(event);
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /not now/i }));
    expect(window.localStorage.getItem(DISMISS_KEY)).not.toBeNull();
    expect(
      screen.queryByRole("region", { name: /install carolina futons/i }),
    ).toBeNull();
  });

  it("treats a declined system prompt as a dismissal so we don't re-nag", async () => {
    render(<PwaInstallBanner />);
    const { event } = makePromptEvent("dismissed");
    await act(async () => {
      window.dispatchEvent(event);
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /^install$/i }));
    // localStorage write happens after two awaits in handleInstall — wait for
    // the microtask chain to settle rather than asserting synchronously.
    await waitFor(() => {
      expect(window.localStorage.getItem(DISMISS_KEY)).not.toBeNull();
    });
  });

  it("does not surface the banner when dismissed within the 30-day window", async () => {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now() - 1000));
    render(<PwaInstallBanner />);
    const { event } = makePromptEvent();
    await act(async () => {
      window.dispatchEvent(event);
    });
    expect(
      screen.queryByRole("region", { name: /install carolina futons/i }),
    ).toBeNull();
  });

  it("re-surfaces the banner once a stale dismissal expires", async () => {
    const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
    window.localStorage.setItem(DISMISS_KEY, String(thirtyOneDaysAgo));
    render(<PwaInstallBanner />);
    const { event } = makePromptEvent();
    await act(async () => {
      window.dispatchEvent(event);
    });
    expect(
      screen.getByRole("region", { name: /install carolina futons/i }),
    ).toBeInTheDocument();
  });

  it("ignores a non-finite stored dismissal value", async () => {
    window.localStorage.setItem(DISMISS_KEY, "not-a-number");
    render(<PwaInstallBanner />);
    const { event } = makePromptEvent();
    await act(async () => {
      window.dispatchEvent(event);
    });
    expect(
      screen.getByRole("region", { name: /install carolina futons/i }),
    ).toBeInTheDocument();
  });

  it("treats a localStorage read throw as not-dismissed (Lockdown Mode/ITP)", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });
    render(<PwaInstallBanner />);
    const { event } = makePromptEvent();
    await act(async () => {
      window.dispatchEvent(event);
    });
    expect(
      screen.getByRole("region", { name: /install carolina futons/i }),
    ).toBeInTheDocument();
  });

  it("hides itself when 'appinstalled' fires while the banner is showing", async () => {
    render(<PwaInstallBanner />);
    const { event } = makePromptEvent();
    await act(async () => {
      window.dispatchEvent(event);
    });
    await act(async () => {
      window.dispatchEvent(new Event("appinstalled"));
    });
    expect(
      screen.queryByRole("region", { name: /install carolina futons/i }),
    ).toBeNull();
  });

  it("does not surface the banner when the app is already in standalone mode", async () => {
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: query === "(display-mode: standalone)",
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    render(<PwaInstallBanner />);
    const { event } = makePromptEvent();
    await act(async () => {
      window.dispatchEvent(event);
    });
    expect(
      screen.queryByRole("region", { name: /install carolina futons/i }),
    ).toBeNull();
  });

  it("replaces a stale deferredPrompt when beforeinstallprompt fires twice", async () => {
    render(<PwaInstallBanner />);
    const first = makePromptEvent();
    await act(async () => {
      window.dispatchEvent(first.event);
    });
    const second = makePromptEvent();
    await act(async () => {
      window.dispatchEvent(second.event);
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /^install$/i }));
    // Only the most recent event's prompt() should fire.
    expect(second.prompt).toHaveBeenCalledTimes(1);
    expect(first.prompt).not.toHaveBeenCalled();
  });

  it("removes its event listeners on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<PwaInstallBanner />);
    unmount();
    const removed = removeSpy.mock.calls.map((args) => args[0]);
    expect(removed).toContain("beforeinstallprompt");
    expect(removed).toContain("appinstalled");
  });
});
