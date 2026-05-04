// Room planner localStorage persistence — cf-l6aj.15.
// Saves and loads LayoutState under a versioned key so future schema changes
// can be detected and stale data silently discarded.

import {
  encodeLayout,
  decodeLayout,
  type LayoutState,
} from "@/lib/design-a-room/planner-logic";

export const ROOM_PLANNER_STORAGE_KEY = "cf:room-planner:v1";

export function saveLayout(state: LayoutState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ROOM_PLANNER_STORAGE_KEY, encodeLayout(state));
  } catch {
    // Quota exceeded or private-mode restriction — safe to swallow.
  }
}

export function loadLayout(): LayoutState | null {
  if (typeof window === "undefined") return null;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(ROOM_PLANNER_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  return decodeLayout(raw);
}

export function clearLayout(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ROOM_PLANNER_STORAGE_KEY);
  } catch {
    // ignore
  }
}
