import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const actionMocks = vi.hoisted(() => ({
  managePushPreferences: vi.fn(),
}));

vi.mock("@/app/actions/preferences", async () => {
  const actual = await vi.importActual<
    typeof import("@/app/actions/preferences")
  >("@/app/actions/preferences");
  return {
    ...actual,
    managePushPreferences: actionMocks.managePushPreferences,
  };
});

import { PreferencesForm } from "@/components/member/PreferencesForm";
import {
  DEFAULT_PREFERENCES,
  PREFERENCE_CATEGORIES,
} from "@/app/actions/preferences";

beforeEach(() => {
  actionMocks.managePushPreferences.mockReset();
  actionMocks.managePushPreferences.mockResolvedValue({
    success: true,
    prefs: DEFAULT_PREFERENCES,
  });
});

describe("<PreferencesForm />", () => {
  it("renders one checkbox per category seeded from initial", () => {
    render(<PreferencesForm initial={DEFAULT_PREFERENCES} />);
    for (const category of PREFERENCE_CATEGORIES) {
      const cb = screen.getByTestId(`pref-${category}`) as HTMLInputElement;
      expect(cb.checked).toBe(true);
    }
  });

  it("toggles a checkbox locally without calling the action", () => {
    render(<PreferencesForm initial={DEFAULT_PREFERENCES} />);
    const marketing = screen.getByTestId("pref-marketing") as HTMLInputElement;
    fireEvent.click(marketing);
    expect(marketing.checked).toBe(false);
    expect(actionMocks.managePushPreferences).not.toHaveBeenCalled();
  });

  it("calls managePushPreferences with the current map on Save", async () => {
    render(<PreferencesForm initial={DEFAULT_PREFERENCES} />);
    fireEvent.click(screen.getByTestId("pref-marketing"));
    fireEvent.click(screen.getByRole("button", { name: /save preferences/i }));
    await waitFor(() => {
      expect(actionMocks.managePushPreferences).toHaveBeenCalledWith({
        challenges: true,
        streak: true,
        marketing: false,
        tier: true,
        badges: true,
      });
    });
  });

  it("shows a Saved status and replaces local state with server-canonical map on success", async () => {
    actionMocks.managePushPreferences.mockResolvedValueOnce({
      success: true,
      prefs: { ...DEFAULT_PREFERENCES, marketing: false },
    });
    render(<PreferencesForm initial={DEFAULT_PREFERENCES} />);
    fireEvent.click(screen.getByTestId("pref-marketing"));
    fireEvent.click(screen.getByRole("button", { name: /save preferences/i }));
    await waitFor(() => {
      expect(screen.getByTestId("preferences-saved")).toBeInTheDocument();
    });
    expect(
      (screen.getByTestId("pref-marketing") as HTMLInputElement).checked,
    ).toBe(false);
  });

  it("surfaces the velo error message and keeps local edits on failure", async () => {
    actionMocks.managePushPreferences.mockResolvedValueOnce({
      success: false,
      error: "unknown category",
    });
    render(<PreferencesForm initial={DEFAULT_PREFERENCES} />);
    fireEvent.click(screen.getByTestId("pref-marketing"));
    fireEvent.click(screen.getByRole("button", { name: /save preferences/i }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("unknown category");
    });
    // User's edit preserved so they can correct + retry without losing work.
    expect(
      (screen.getByTestId("pref-marketing") as HTMLInputElement).checked,
    ).toBe(false);
    expect(screen.queryByTestId("preferences-saved")).toBeNull();
  });

  it("surfaces a generic error when the action throws", async () => {
    actionMocks.managePushPreferences.mockRejectedValueOnce(
      new Error("network fail"),
    );
    render(<PreferencesForm initial={DEFAULT_PREFERENCES} />);
    fireEvent.click(screen.getByRole("button", { name: /save preferences/i }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/could not save/i);
    });
  });
});
