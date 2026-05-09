// cfw-9vs: Legacy share URL — permanently redirected to /wishlist-share/[token].
//
// The original route lived under /wishlist/[token] (cf-u89z), which now
// shadows the authenticated /wishlist surface introduced in cfw-9vs. We
// keep this stub so share links emailed/copied before the move still
// resolve. Issue a 308 so caches/crawlers relearn the new URL.

import { permanentRedirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LegacyWishlistShareRedirect({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  permanentRedirect(`/wishlist-share/${token}`);
}
