import { DashboardShell } from "@/components/member/DashboardShell";
import { WishlistList } from "@/components/member/WishlistList";
import { WishlistShareButton } from "@/components/member/WishlistShareButton";
import { getWishlist } from "@/app/actions/wishlist";
import { getMemberSession } from "@/lib/auth/member";
import { getWixClientWithTokens } from "@/lib/wix-client";
import { logError } from "@/lib/logging/log-error";
import type { WishlistResponse } from "@/lib/wishlist/wishlist-types";

export const dynamic = "force-dynamic";

export default async function DashboardWishlistPage() {
  const session = await getMemberSession();
  if (!session) return null;

  const client = getWixClientWithTokens(session.tokens);
  const { member } = await client.members.getCurrentMember();
  const fullName = [member?.contact?.firstName, member?.contact?.lastName]
    .filter(Boolean)
    .join(" ");
  const memberName = member?.profile?.nickname ?? (fullName || null);
  const memberEmail = member?.loginEmail ?? null;

  // getWishlist (Server Action wrapping wishlistService/getWishlist) returns
  // {success, items, total}. On Velo failure success:false comes back with
  // an empty items[] — the empty state below covers both no-wishlist and
  // backend-down so the page never throws.
  let initialItems: WishlistResponse["items"] = [];
  let wishlistLoadFailed = false;
  try {
    const result = (await getWishlist()) as WishlistResponse | undefined;
    if (result?.success === false) {
      wishlistLoadFailed = true;
    } else {
      initialItems = result?.items ?? [];
    }
  } catch (err) {
    // cfw-r6w8: ship to Sentry so the empty-state-on-failure path is
    // observable. Member dashboard renders the empty state below
    // either way — the goal is to flag the upstream wishlist outage,
    // not to surface the error to the member.
    await logError("wishlist", "getWishlist", err);
    wishlistLoadFailed = true;
  }

  return (
    <DashboardShell
      memberId={session.memberId}
      memberName={memberName}
      memberEmail={memberEmail}
      activeTab="wishlist"
    >
      <section
        aria-labelledby="dashboard-wishlist-heading"
        data-slot="dashboard-wishlist"
        className="space-y-6"
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="dashboard-wishlist-heading"
              className="font-heading text-xl font-semibold text-cf-ink"
            >
              Your wishlist
            </h2>
            <p className="mt-1 text-sm text-cf-muted">
              Items you&rsquo;ve saved from product pages.
            </p>
          </div>
          <WishlistShareButton loadFailed={wishlistLoadFailed} />
        </header>

        <WishlistList initialItems={initialItems} />
      </section>
    </DashboardShell>
  );
}
