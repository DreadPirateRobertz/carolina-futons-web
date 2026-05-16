"use server";

import { withMember } from "@/lib/auth/member";
import { logError } from "@/lib/logger";
import { callVelo } from "@/lib/wix/velo-client";
import {
  DEFAULT_PREFERENCES,
  PREFERENCE_CATEGORIES,
  type PreferenceMap,
  type PreferencesResult,
} from "@/app/actions/preferences-state";

// `PREFERENCE_CATEGORIES`, `DEFAULT_PREFERENCES`, and the type aliases
// live in `./preferences-state` because `"use server"` modules may only
// export async functions — exporting them here broke
// /dashboard/preferences page-data collection. See cf-3qt.4.6 /
// contact-state.ts for the same extraction pattern.

const m = (method: string) => `pushNotificationService/${method}`;

export async function getMyPushPreferences(): Promise<PreferencesResult> {
  return withMember(async (s) => {
    try {
      const result = (await callVelo({
        method: m("getMyPushPreferences"),
        args: [],
        accessToken: s.accessToken,
      })) as
        | { success: boolean; prefs?: Partial<PreferenceMap>; error?: string }
        | undefined;
      if (!result?.success) {
        return {
          success: false,
          error: result?.error ?? "Could not load preferences.",
        } satisfies PreferencesResult;
      }
      return {
        success: true,
        prefs: { ...DEFAULT_PREFERENCES, ...(result.prefs ?? {}) },
      } satisfies PreferencesResult;
    } catch (err) {
      logError(
        "preferences",
        "getMyPushPreferences failed",
        err instanceof Error ? err : { err },
      );
      return { success: false, error: "Could not load preferences." };
    }
  });
}

export async function managePushPreferences(
  prefs: Partial<PreferenceMap>,
): Promise<PreferencesResult> {
  return withMember(async (s) => {
    // Drop any unknown keys before forwarding so the Velo validator
    // doesn't 400 on a typo'd category from a stale client.
    const cleaned: Partial<PreferenceMap> = {};
    for (const k of PREFERENCE_CATEGORIES) {
      if (typeof prefs[k] === "boolean") cleaned[k] = prefs[k];
    }
    try {
      const result = (await callVelo({
        method: m("managePushPreferences"),
        args: [cleaned],
        accessToken: s.accessToken,
      })) as
        | { success: boolean; prefs?: Partial<PreferenceMap>; error?: string }
        | undefined;
      if (!result?.success) {
        return {
          success: false,
          error: result?.error ?? "Could not save preferences.",
        };
      }
      return {
        success: true,
        prefs: { ...DEFAULT_PREFERENCES, ...(result.prefs ?? cleaned) },
      };
    } catch (err) {
      logError(
        "preferences",
        "managePushPreferences failed",
        err instanceof Error ? err : { err },
      );
      return { success: false, error: "Could not save preferences." };
    }
  });
}
