import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

import type { ConsentGrantMap } from "@/lib/consent/consent-state";

const actionMock = vi.hoisted(() => ({ setConsentMap: vi.fn() }));
vi.mock("@/app/actions/consent", () => ({
  setConsentMap: actionMock.setConsentMap,
}));

const ALL_DENIED: ConsentGrantMap = {
  analytics_storage: "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
};

const ALL_GRANTED: ConsentGrantMap = {
  analytics_storage: "granted",
  ad_storage: "granted",
  ad_user_data: "granted",
  ad_personalization: "granted",
};

beforeEach(() => {
  actionMock.setConsentMap.mockReset().mockResolvedValue({ ok: true });
});

async function renderPrefs(initialMap: ConsentGrantMap = ALL_DENIED) {
  const { ConsentPreferences } = await import(
    "@/components/analytics/ConsentPreferences"
  );
  return render(<ConsentPreferences initialMap={initialMap} />);
}

describe("ConsentPreferences — rendering", () => {
  it("renders the section with all 4 toggle switches", async () => {
    await renderPrefs();
    const switches = screen.getAllByRole("switch");
    expect(switches).toHaveLength(4);
  });

  it("shows 'Analytics' toggle", async () => {
    await renderPrefs();
    expect(screen.getByRole("switch", { name: /analytics/i })).toBeInTheDocument();
  });

  it("reflects initial 'denied' state — all switches off", async () => {
    await renderPrefs(ALL_DENIED);
    const switches = screen.getAllByRole("switch");
    for (const sw of switches) {
      expect(sw).toHaveAttribute("aria-checked", "false");
    }
  });

  it("reflects initial 'granted' state — all switches on", async () => {
    await renderPrefs(ALL_GRANTED);
    const switches = screen.getAllByRole("switch");
    for (const sw of switches) {
      expect(sw).toHaveAttribute("aria-checked", "true");
    }
  });

  it("reflects a mixed initial map correctly", async () => {
    const mixed: ConsentGrantMap = {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "granted",
    };
    await renderPrefs(mixed);
    expect(screen.getByRole("switch", { name: /analytics/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("switch", { name: /advertising/i })).toHaveAttribute("aria-checked", "false");
  });
});

describe("ConsentPreferences — interactions", () => {
  it("toggling a switch flips its aria-checked state", async () => {
    await renderPrefs(ALL_DENIED);
    const analyticsSwitch = screen.getByRole("switch", { name: /analytics/i });
    expect(analyticsSwitch).toHaveAttribute("aria-checked", "false");
    fireEvent.click(analyticsSwitch);
    expect(analyticsSwitch).toHaveAttribute("aria-checked", "true");
  });

  it("'Accept all' sets all switches to on", async () => {
    await renderPrefs(ALL_DENIED);
    fireEvent.click(screen.getByRole("button", { name: /accept all/i }));
    const switches = screen.getAllByRole("switch");
    for (const sw of switches) {
      expect(sw).toHaveAttribute("aria-checked", "true");
    }
  });

  it("'Reject all' sets all switches to off", async () => {
    await renderPrefs(ALL_GRANTED);
    fireEvent.click(screen.getByRole("button", { name: /reject all/i }));
    const switches = screen.getAllByRole("switch");
    for (const sw of switches) {
      expect(sw).toHaveAttribute("aria-checked", "false");
    }
  });

  it("'Save preferences' calls setConsentMap with current map", async () => {
    await renderPrefs(ALL_DENIED);
    // Toggle analytics on.
    fireEvent.click(screen.getByRole("switch", { name: /analytics/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /save preferences/i }));
    });
    expect(actionMock.setConsentMap).toHaveBeenCalledOnce();
    expect(actionMock.setConsentMap).toHaveBeenCalledWith(
      expect.objectContaining({ analytics_storage: "granted" }),
    );
  });

  it("shows 'Preferences saved.' status message after successful save", async () => {
    await renderPrefs();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /save preferences/i }));
    });
    expect(screen.getByRole("status")).toHaveTextContent(/preferences saved/i);
  });

  it("clears the saved status message when a toggle is changed after save", async () => {
    await renderPrefs();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /save preferences/i }));
    });
    expect(screen.getByRole("status")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: /analytics/i }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("does not show saved message when setConsentMap returns ok:false", async () => {
    actionMock.setConsentMap.mockResolvedValueOnce({ ok: false });
    await renderPrefs();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /save preferences/i }));
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
