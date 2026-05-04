"use client";

import { useState, useTransition } from "react";

import { managePushPreferences } from "@/app/actions/preferences";
import {
  PREFERENCE_CATEGORIES,
  type PreferenceCategory,
  type PreferenceMap,
} from "@/app/actions/preferences-state";

export type PreferencesFormProps = {
  initial: PreferenceMap;
};

const CATEGORY_LABEL: Record<PreferenceCategory, string> = {
  challenges: "Weekly challenges",
  streak: "Streak reminders",
  marketing: "New arrivals & sales",
  tier: "Tier and rewards updates",
  badges: "Badge unlocks",
};

const CATEGORY_HELP: Record<PreferenceCategory, string> = {
  challenges: "When a new weekly challenge starts and when one is about to end.",
  streak: "When your activity streak is at risk of ending.",
  marketing: "New arrivals, seasonal sales, and the occasional studio note.",
  tier: "When you move up a loyalty tier or earn redeemable rewards.",
  badges: "When you unlock a new badge.",
};

// cf-rtd7.AUTH.3 / cf-3qt.3 prefs surface. Optimistic toggle state with
// pending guard. On Save we forward to managePushPreferences; on success
// we replace local state with the server-canonical map (so dropped keys
// or server defaults are reflected). On error we keep the user's edits
// and show the message so they can retry.
export function PreferencesForm({ initial }: PreferencesFormProps) {
  const [prefs, setPrefs] = useState<PreferenceMap>(initial);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(category: PreferenceCategory) {
    setPrefs((curr) => ({ ...curr, [category]: !curr[category] }));
    setError(null);
    setSavedAt(null);
  }

  function handleSave() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await managePushPreferences(prefs);
        if (!result.success) {
          setError(result.error);
          return;
        }
        setPrefs(result.prefs);
        setSavedAt(Date.now());
      } catch {
        setError("Could not save preferences. Please try again.");
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
      data-slot="preferences-form"
      className="space-y-6"
    >
      <fieldset className="space-y-4" disabled={pending}>
        <legend className="sr-only">Notification categories</legend>
        {PREFERENCE_CATEGORIES.map((category) => (
          <label
            key={category}
            className="flex items-start gap-3 rounded-lg border border-cf-divider bg-white p-4 dark:bg-cf-cream"
          >
            <input
              type="checkbox"
              checked={prefs[category]}
              onChange={() => toggle(category)}
              data-testid={`pref-${category}`}
              className="mt-1 h-4 w-4 rounded border-cf-divider text-cf-cta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <span className="flex-1">
              <span className="block font-medium text-cf-ink">
                {CATEGORY_LABEL[category]}
              </span>
              <span className="mt-0.5 block text-xs text-cf-muted">
                {CATEGORY_HELP[category]}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center justify-center rounded-md bg-cf-cta px-5 text-sm font-medium text-white transition-colors hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save preferences"}
        </button>
        {error ? (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {savedAt && !error ? (
          <p
            role="status"
            data-testid="preferences-saved"
            className="text-sm text-emerald-700"
          >
            Saved.
          </p>
        ) : null}
      </div>
    </form>
  );
}
