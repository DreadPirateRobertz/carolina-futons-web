// cf-7axq: localStorage-backed compare list. Pure functions + a hook so both
// PDP and PLP card buttons share the same state without a top-level provider.

import { COMPARE_MAX } from "@/lib/product/compare";

const STORAGE_KEY = "cf-compare-slugs";

export function getCompareSlugs(): string[] {
  try {
    const raw =
      typeof window !== "undefined"
        ? window.localStorage.getItem(STORAGE_KEY)
        : null;
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? (parsed as unknown[])
          .filter((s): s is string => typeof s === "string")
          .slice(0, COMPARE_MAX)
      : [];
  } catch {
    return [];
  }
}

export function setCompareSlugs(slugs: string[]): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(slugs.slice(0, COMPARE_MAX)),
    );
    window.dispatchEvent(new Event("cf-compare-change"));
  } catch {
    // localStorage unavailable (private browsing, storage quota) — silently skip
  }
}

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

export function buildCompareUrl(slugs: string[]): string {
  return `/compare?slugs=${slugs.join(",")}`;
}
