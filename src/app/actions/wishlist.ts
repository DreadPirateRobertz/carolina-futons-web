"use server";

import { getMemberSession, withMember } from "@/lib/auth/member";
import { callVelo } from "@/lib/wix/velo-client";
import { signMemberId, verifyShareToken } from "@/lib/wishlist/share-token";
import type { WishlistResponse } from "@/lib/wishlist/wishlist-types";

const w = (method: string) => `wishlistService/${method}`;

export async function addToWishlist(
  productId: string,
  name: string,
  price: number,
  opts?: { variantId?: string; image?: string },
) {
  return withMember((m) =>
    callVelo({
      method: w("addToWishlist"),
      args: [productId, name, price, opts ?? {}],
      accessToken: m.accessToken,
    }),
  );
}

// PDP-side variant: does not redirect on missing session. The Heart button
// renders for both logged-in and logged-out visitors, so we surface the
// auth gap explicitly via {requiresAuth:true} and let the client trigger
// the OAuth round-trip itself with the PDP path as the post-login return.
export type AddToWishlistFromPdpResult =
  | { success: true }
  | { success: false; requiresAuth: true }
  | { success: false; requiresAuth?: false; error: string };

export async function addToWishlistFromPdp(
  productId: string,
  name: string,
  price: number,
  opts?: { variantId?: string; image?: string },
): Promise<AddToWishlistFromPdpResult> {
  const session = await getMemberSession();
  if (!session) return { success: false, requiresAuth: true };
  try {
    const result = (await callVelo({
      method: w("addToWishlist"),
      args: [productId, name, price, opts ?? {}],
      accessToken: session.accessToken,
    })) as { success: boolean; error?: string } | undefined;
    if (!result?.success) {
      return {
        success: false,
        error: result?.error ?? "Could not save. Please try again.",
      };
    }
    return { success: true };
  } catch (err) {
    console.error("[wishlist] addToWishlistFromPdp failed:", err);
    return { success: false, error: "Could not save. Please try again." };
  }
}

export async function removeFromWishlist(productId: string) {
  return withMember((m) =>
    callVelo({
      method: w("removeFromWishlist"),
      args: [productId],
      accessToken: m.accessToken,
    }),
  );
}

export async function getWishlist() {
  return withMember((m) =>
    callVelo({ method: w("getWishlist"), args: [], accessToken: m.accessToken }),
  );
}

export async function isOnWishlist(productId: string) {
  return withMember((m) =>
    callVelo({
      method: w("isOnWishlist"),
      args: [productId],
      accessToken: m.accessToken,
    }),
  );
}

// ── Share token (cf-u89z) ─────────────────────────────────────────

// Falls back to a dev placeholder so the feature works locally without
// secrets configured. Production MUST set WISHLIST_SHARE_SECRET.
function shareSecret(): string {
  return process.env.WISHLIST_SHARE_SECRET ?? "dev-wishlist-secret-change-in-prod";
}

export async function generateShareToken(): Promise<
  { success: true; token: string } | { success: false }
> {
  const session = await getMemberSession();
  if (!session?.memberId) return { success: false };
  const token = signMemberId(session.memberId, shareSecret());
  return { success: true, token };
}

export async function getSharedWishlist(token: string): Promise<
  { success: true; items: WishlistResponse["items"]; total: number } | { success: false }
> {
  const memberId = verifyShareToken(token, shareSecret());
  if (!memberId) return { success: false };
  try {
    const result = (await callVelo({
      method: w("getWishlistByMemberId"),
      args: [memberId],
      // No accessToken — getWishlistByMemberId uses Permissions.Anyone
    })) as WishlistResponse | undefined;
    if (!result?.success) return { success: false };
    return { success: true, items: result.items, total: result.total };
  } catch (err) {
    console.error("[wishlist] getSharedWishlist failed:", err);
    return { success: false };
  }
}
