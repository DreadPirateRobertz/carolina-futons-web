"use server";

import { getMemberSession, withMember } from "@/lib/auth/member";
import { callVelo } from "@/lib/wix/velo-client";

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
