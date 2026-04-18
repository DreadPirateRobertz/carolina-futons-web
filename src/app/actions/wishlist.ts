"use server";

import { withMember } from "@/lib/auth/member";
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
