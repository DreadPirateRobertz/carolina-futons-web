// Gift registry localStorage storage layer (cf-l6aj.16).
//
// Registries are stored as a JSON array under REGISTRY_STORAGE_KEY.
// Each entry is a full RegistryDetail (items start empty). Reads are
// always defensive: a corrupted or missing blob returns [].
// No server trip, no Wix CMS dep — this is the v1 local-only implementation.

import type { RegistryDetail } from "./registry-types";

export const REGISTRY_STORAGE_KEY = "cf:registry:v1";

function coerceRegistry(raw: unknown): RegistryDetail | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r._id !== "string" || !r._id) return null;
  if (typeof r.title !== "string" || !r.title) return null;
  if (typeof r.slug !== "string") return null;
  if (typeof r.occasion !== "string") return null;
  if (typeof r.isPublic !== "boolean") return null;
  if (!Array.isArray(r.items)) return null;
  return {
    _id: r._id,
    title: r.title,
    slug: typeof r.slug === "string" ? r.slug : r._id,
    occasion: r.occasion as RegistryDetail["occasion"],
    eventDate: typeof r.eventDate === "string" ? r.eventDate : null,
    message: typeof r.message === "string" ? r.message : undefined,
    isPublic: r.isPublic,
    items: [],
  };
}

export function readRegistries(
  storage: Pick<Storage, "getItem"> | null | undefined,
): RegistryDetail[] {
  if (!storage) return [];
  let raw: string | null;
  try {
    raw = storage.getItem(REGISTRY_STORAGE_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const registries: RegistryDetail[] = [];
  for (const candidate of parsed) {
    const reg = coerceRegistry(candidate);
    if (reg) registries.push(reg);
  }
  return registries;
}

export function writeRegistries(
  storage: Pick<Storage, "setItem"> | null | undefined,
  registries: ReadonlyArray<RegistryDetail>,
): void {
  if (!storage) return;
  try {
    storage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(registries));
  } catch {
    // Quota exceeded — accept silently.
  }
}

export function getRegistry(
  storage: Pick<Storage, "getItem"> | null | undefined,
  id: string,
): RegistryDetail | null {
  return readRegistries(storage).find((r) => r._id === id) ?? null;
}

export function createRegistry(
  storage: Pick<Storage, "getItem" | "setItem"> | null | undefined,
  fields: Pick<RegistryDetail, "title" | "occasion" | "eventDate" | "message" | "isPublic">,
): RegistryDetail {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  const next: RegistryDetail = {
    _id: id,
    slug: id,
    title: fields.title,
    occasion: fields.occasion,
    eventDate: fields.eventDate ?? null,
    message: fields.message,
    isPublic: fields.isPublic,
    items: [],
  };
  const existing = readRegistries(storage);
  writeRegistries(storage, [next, ...existing]);
  return next;
}

export function deleteRegistry(
  storage: Pick<Storage, "getItem" | "setItem"> | null | undefined,
  id: string,
): void {
  const existing = readRegistries(storage);
  writeRegistries(
    storage,
    existing.filter((r) => r._id !== id),
  );
}
