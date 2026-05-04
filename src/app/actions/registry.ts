"use server";

import { getMemberSession, withMember } from "@/lib/auth/member";
import { callVelo } from "@/lib/wix/velo-client";
import type {
  RegistrySummary,
  PublicRegistry,
  RegistryOccasion,
} from "@/lib/registry/registry-types";

const r = (method: string) => `giftRegistry/${method}`;

// ── Owner actions (require auth) ──────────────────────────────────────────────

export async function getMyRegistriesAction(): Promise<
  { success: true; registries: RegistrySummary[] } | { success: false; error: string }
> {
  return withMember((m) =>
    callVelo({ method: r("getMyRegistries"), args: [], accessToken: m.accessToken }),
  ).then((res: unknown) => {
    const typed = res as { success: boolean; data?: { registries: RegistrySummary[] }; error?: string };
    if (!typed.success) return { success: false as const, error: typed.error ?? "Failed to load registries" };
    return { success: true as const, registries: typed.data?.registries ?? [] };
  }).catch(() => ({ success: false as const, error: "Failed to load registries" }));
}

export async function createRegistryAction(data: {
  title: string;
  occasion: RegistryOccasion;
  eventDate?: string;
  message?: string;
  isPublic: boolean;
}): Promise<{ success: true; registryId: string; slug: string } | { success: false; error: string }> {
  return withMember((m) =>
    callVelo({ method: r("createRegistry"), args: [data], accessToken: m.accessToken }),
  ).then((res: unknown) => {
    const typed = res as { success: boolean; data?: { _id: string; slug: string }; error?: string };
    if (!typed.success) return { success: false as const, error: typed.error ?? "Failed to create registry" };
    return { success: true as const, registryId: typed.data!._id, slug: typed.data!.slug };
  }).catch(() => ({ success: false as const, error: "Failed to create registry" }));
}

export async function deleteRegistryAction(
  registryId: string,
): Promise<{ success: boolean; error?: string }> {
  return withMember((m) =>
    callVelo({ method: r("deleteRegistry"), args: [registryId], accessToken: m.accessToken }),
  ).then((res) => res as { success: boolean; error?: string })
   .catch(() => ({ success: false as boolean, error: "Failed to delete registry" }));
}

// ── Public actions (no auth needed) ──────────────────────────────────────────

export async function getPublicRegistryAction(
  slug: string,
): Promise<{ success: true; registry: PublicRegistry } | { success: false }> {
  try {
    const session = await getMemberSession();
    const res = (await callVelo({
      method: r("getPublicRegistry"),
      args: [slug],
      accessToken: session?.accessToken,
    })) as { success: boolean; data?: PublicRegistry };
    if (!res.success || !res.data) return { success: false };
    return { success: true, registry: res.data };
  } catch {
    return { success: false };
  }
}

export async function markItemPurchasedAction(
  itemId: string,
  buyerName: string,
  quantity: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getMemberSession();
    const res = (await callVelo({
      method: r("markItemPurchased"),
      args: [itemId, { buyerName, quantity }],
      accessToken: session?.accessToken,
    })) as { success: boolean; error?: string };
    return res;
  } catch {
    return { success: false, error: "Failed to mark item as purchased" };
  }
}
