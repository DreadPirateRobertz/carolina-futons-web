"use server";

import { getMemberSession, withMember } from "@/lib/auth/member";
import { signMemberId, verifyShareToken } from "@/lib/wishlist/share-token";
import type { WishlistResponse } from "@/lib/wishlist/wishlist-types";
import { logError } from "@/lib/logging/log-error";
import {
  addWishlistItem,
  fetchWishlist,
  fetchWishlistByMemberId,
  isProductOnWishlist,
  removeWishlistItem,
  type WishlistAddOpts,
} from "@/lib/wix/wishlist";

export async function addToWishlist(
  productId: string,
  name: string,
  price: number,
  opts?: WishlistAddOpts,
) {
  return withMember((m) =>
    addWishlistItem(m.accessToken, productId, name, price, opts ?? {}),
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
  opts?: WishlistAddOpts,
): Promise<AddToWishlistFromPdpResult> {
  const session = await getMemberSession();
  if (!session) return { success: false, requiresAuth: true };
  try {
    const result = await addWishlistItem(
      session.accessToken,
      productId,
      name,
      price,
      opts ?? {},
    );
    if (!result?.success) {
      return {
        success: false,
        error: result?.error ?? "Could not save. Please try again.",
      };
    }
    return { success: true };
  } catch (err) {
    await logError("wishlist", "addToWishlistFromPdp", err);
    return { success: false, error: "Could not save. Please try again." };
  }
}

export async function removeFromWishlist(productId: string) {
  return withMember((m) => removeWishlistItem(m.accessToken, productId));
}

export async function getWishlist() {
  return withMember((m) => fetchWishlist(m.accessToken));
}

export async function isOnWishlist(productId: string) {
  return withMember((m) => isProductOnWishlist(m.accessToken, productId));
}

// cfw-9vs: header badge count. Returns 0 (rather than redirecting) when the
// visitor isn't signed in — the badge silently hides instead of forcing an
// OAuth round-trip on every page load. Errors collapse to 0 too; a missing
// badge is preferable to a server-error toast on the global header.
export async function getWishlistCount(): Promise<number> {
  const session = await getMemberSession();
  if (!session) return 0;
  try {
    const result = await fetchWishlist(session.accessToken);
    if (!result?.success) return 0;
    return result.total ?? result.items?.length ?? 0;
  } catch (err) {
    await logError("wishlist", "getWishlistCount", err);
    return 0;
  }
}

// ── Share token (cf-u89z) ─────────────────────────────────────────

// Throws in production if WISHLIST_SHARE_SECRET is not set — a missing
// secret would sign tokens with a known plaintext, undermining the HMAC.
// Set it in Vercel env vars (see .env.example).
function shareSecret(): string {
  const s = process.env.WISHLIST_SHARE_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("WISHLIST_SHARE_SECRET env var is required in production");
    }
    return "dev-wishlist-secret-change-in-prod";
  }
  return s;
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
    const result = await fetchWishlistByMemberId(memberId);
    if (!result?.success) return { success: false };
    return { success: true, items: result.items, total: result.total };
  } catch (err) {
    await logError("wishlist", "getSharedWishlist", err);
    return { success: false };
  }
}
