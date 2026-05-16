// cfw-9vs: Top-level /wishlist route.
//
// Auth-gated entry point for the member's wishlist. Differs from the
// dashboard sub-tab at /(member)/dashboard/wishlist in two ways:
//   1. Standalone full-width layout — no DashboardShell chrome, so deep
//      links from PDP/email/share land on a focused wishlist surface.
//   2. Per-row qty selector + Add-to-cart action, which the dashboard
//      tab intentionally omits (read+remove only there).
//
// Unauthenticated visitors are redirected through the OAuth round-trip
// via withMember() inside getWishlist(). Velo failure (success:false or
// throw) collapses to the empty state instead of throwing — the page
// must always render something the visitor can navigate away from.

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getWishlist } from "@/app/actions/wishlist";
import { WishlistView } from "@/components/wishlist/WishlistView";
import { getMemberSession } from "@/lib/auth/member";
import { logError } from "@/lib/logger";
import type { WishlistResponse } from "@/lib/wishlist/wishlist-types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your Wishlist — Carolina Futons",
  description: "Items you've saved for later from Carolina Futons.",
  robots: { index: false },
};

export default async function WishlistPage() {
  const session = await getMemberSession();
  if (!session) {
    // Send the visitor through the same OAuth round-trip the rest of the
    // member surfaces use; /api/auth/session redirects back here on success.
    redirect("/account?return_to=/wishlist");
  }

  let initialItems: WishlistResponse["items"] = [];
  try {
    const result = (await getWishlist()) as WishlistResponse | undefined;
    if (result?.success !== false) {
      initialItems = result?.items ?? [];
    }
  } catch (err) {
    logError(
      "wishlist-page",
      "page load failed",
      err instanceof Error ? err : { err },
    );
  }

  return <WishlistView initialItems={initialItems} />;
}
