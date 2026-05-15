// cf-7axq: localStorage-backed compare list. Pure functions + a hook so both
// PDP and PLP card buttons share the same state without a top-level provider.
//
// cf-eqaj observability (2026-05-15): persistence failures no longer fail
// silently. setCompareSlugs / getCompareSlugs dispatch a
// `cf-compare-change-error` CustomEvent on the window whose `detail.reason`
// identifies the failure class. The CompareBar (or any future toast /
// inline-banner consumer) can subscribe and surface user feedback instead
// of pretending the click succeeded.

import { COMPARE_MAX } from "@/lib/product/compare";

const STORAGE_KEY = "cf-compare-slugs";

/**
 * Failure-class identifier dispatched on `cf-compare-change-error` events.
 *
 *   `quota-exceeded` — localStorage.setItem threw a QuotaExceededError
 *     (browser storage full; hits ~5MB on most engines).
 *   `unavailable`    — localStorage.setItem threw for some other reason
 *     (private-browsing variants, Safari ITP storage partitioning, browser
 *     extensions blocking storage access).
 *   `parse-error`    — a previously-stored value couldn't JSON.parse
 *     (likely cross-tab corruption or a manual edit in DevTools).
 */
export type CompareStateErrorReason = "quota-exceeded" | "unavailable" | "parse-error";

/**
 * Dispatch a `cf-compare-change-error` CustomEvent on the window so a
 * subscriber (CompareBar, toast layer, telemetry) can react to the failure.
 *
 * Kept internal — external code consumes via
 * `window.addEventListener("cf-compare-change-error", e => e.detail.reason)`.
 *
 * @param reason - The {@link CompareStateErrorReason} value identifying
 *   which localStorage operation failed.
 */
function dispatchCompareError(reason: CompareStateErrorReason): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("cf-compare-change-error", { detail: { reason } }),
  );
}

/**
 * Read the current compare list from localStorage.
 *
 * Returns `[]` on any failure (SSR, missing key, malformed value); the
 * return contract is unchanged from before cf-eqaj. The difference is
 * observability — when the stored JSON is malformed, a
 * `cf-compare-change-error` event with `reason: "parse-error"` now fires
 * so the consumer can clear the poisoned key + show feedback rather than
 * silently treating it as an empty list.
 *
 * @returns Up to {@link COMPARE_MAX} slug strings, or `[]`.
 */
export function getCompareSlugs(): string[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? (parsed as unknown[])
          .filter((s): s is string => typeof s === "string")
          .slice(0, COMPARE_MAX)
      : [];
  } catch {
    dispatchCompareError("parse-error");
    return [];
  }
}

/**
 * Persist the compare list to localStorage.
 *
 * On success, dispatches `cf-compare-change` so subscribers re-read.
 *
 * On failure (cf-eqaj), dispatches `cf-compare-change-error` with a
 * reason classifier and SKIPS the success event — subscribers must not
 * see a stale "changed" signal when the write never landed.
 *
 * @param slugs - The compare list to persist. Truncated to {@link COMPARE_MAX}.
 */
export function setCompareSlugs(slugs: string[]): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(slugs.slice(0, COMPARE_MAX)),
    );
    window.dispatchEvent(new Event("cf-compare-change"));
  } catch (err) {
    const reason: CompareStateErrorReason =
      err instanceof Error && err.name === "QuotaExceededError"
        ? "quota-exceeded"
        : "unavailable";
    dispatchCompareError(reason);
  }
}

/**
 * Add or remove a slug from the persisted compare list. Caps at
 * {@link COMPARE_MAX} entries — adding a fifth slug is a no-op (returns
 * the current 4-entry list unchanged) so the caller can branch on the
 * stable length without surprise.
 *
 * @param slug - The product slug to toggle.
 * @returns The compare list after the toggle.
 */
export function toggleCompareSlug(slug: string): string[] {
  const current = getCompareSlugs();
  const next = current.includes(slug)
    ? current.filter((s) => s !== slug)
    : current.length < COMPARE_MAX
      ? [...current, slug]
      : current; // at max, ignore add
  setCompareSlugs(next);
  return next;
}

/**
 * Build the canonical compare URL for a list of slugs.
 *
 * @param slugs - The product slugs (in display order).
 * @returns `/compare?slugs=<slug1>,<slug2>,...`
 */
export function buildCompareUrl(slugs: string[]): string {
  return `/compare?slugs=${slugs.join(",")}`;
}
