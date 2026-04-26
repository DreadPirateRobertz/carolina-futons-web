// Constants + types extracted from `actions/preferences.ts` so they live
// outside the `"use server"` module. Next.js Server Action modules may
// only export async functions; exporting `PREFERENCE_CATEGORIES` (array)
// or `DEFAULT_PREFERENCES` (object) from `actions/preferences.ts` made
// `/dashboard/preferences` fail to collect at build time:
//   "A 'use server' file can only export async functions, found object."
//
// Mirrors the pattern used for /contact (cf-3qt.4.6 / contact-state.ts).

// Categories supported by managePushPreferences in
// src/backend/pushNotificationService.web.js. Mirrored here so the cfw
// form can render toggles without a roundtrip to read the taxonomy.
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
