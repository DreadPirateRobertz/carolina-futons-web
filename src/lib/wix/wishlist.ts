// cfw-9vs: Typed wrappers around the Velo `wishlistService` web methods.
// Server-only — every call goes through callVelo and is invoked from a
// Server Action (see src/app/actions/wishlist.ts). Member-scoped reads/
// writes require a member-role accessToken; the public share read uses
// the Anyone-permission `getWishlistByMemberId` instead.
import "server-only";

import { callVelo } from "@/lib/wix/velo-client";
import type { WishlistResponse } from "@/lib/wishlist/wishlist-types";

const w = (method: string) => `wishlistService/${method}`;

export type WishlistAddOpts = {
  variantId?: string;
  image?: string;
};

export type WishlistMutationResult = {
  success: boolean;
  error?: string;
};

export async function addWishlistItem(
  accessToken: string,
  productId: string,
  name: string,
  price: number,
  opts: WishlistAddOpts = {},
): Promise<WishlistMutationResult> {
  return (await callVelo({
    method: w("addToWishlist"),
    args: [productId, name, price, opts],
    accessToken,
  })) as WishlistMutationResult;
}

export async function removeWishlistItem(
  accessToken: string,
  productId: string,
): Promise<WishlistMutationResult> {
  return (await callVelo({
    method: w("removeFromWishlist"),
    args: [productId],
    accessToken,
  })) as WishlistMutationResult;
}

export async function fetchWishlist(
  accessToken: string,
): Promise<WishlistResponse> {
  return (await callVelo({
    method: w("getWishlist"),
    args: [],
    accessToken,
  })) as WishlistResponse;
}

export async function fetchWishlistByMemberId(
  memberId: string,
): Promise<WishlistResponse> {
  // No accessToken — backend method is Permissions.Anyone behind the
  // HMAC-signed share token (see src/lib/wishlist/share-token.ts).
  return (await callVelo({
    method: w("getWishlistByMemberId"),
    args: [memberId],
  })) as WishlistResponse;
}

export async function isProductOnWishlist(
  accessToken: string,
  productId: string,
): Promise<{ success: boolean; onWishlist?: boolean }> {
  return (await callVelo({
    method: w("isOnWishlist"),
    args: [productId],
    accessToken,
  })) as { success: boolean; onWishlist?: boolean };
}
