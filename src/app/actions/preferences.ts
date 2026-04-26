"use server";

import { withMember } from "@/lib/auth/member";
import { callVelo } from "@/lib/wix/velo-client";

const m = (method: string) => `pushNotificationService/${method}`;

// Categories supported by managePushPreferences in
// src/backend/pushNotificationService.web.js. Mirrored here so the cfw form
// can render toggles without a roundtrip to read the taxonomy.
export const PREFERENCE_CATEGORIES = [
  "challenges",
  "streak",
  "marketing",
  "tier",
  "badges",
] as const;

export type PreferenceCategory = (typeof PREFERENCE_CATEGORIES)[number];
export type PreferenceMap = Record<PreferenceCategory, boolean>;

export const DEFAULT_PREFERENCES: PreferenceMap = Object.freeze({
  challenges: true,
  streak: true,
  marketing: true,
  tier: true,
  badges: true,
}) as PreferenceMap;

export type PreferencesResult =
  | { success: true; prefs: PreferenceMap }
  | { success: false; error: string };

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
      console.error("[preferences] getMyPushPreferences failed:", err);
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
      console.error("[preferences] managePushPreferences failed:", err);
      return { success: false, error: "Could not save preferences." };
    }
  });
}
