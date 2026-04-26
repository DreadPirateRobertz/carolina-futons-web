import { NextResponse, type NextRequest } from "next/server";

import { initCheckout } from "@/lib/wix/checkout";
import { logWixFailure } from "@/lib/wix/errors";

// GET /checkout — creates a Wix checkout from the current cart and redirects
// the browser to the Wix-hosted payment page. On failure, bounces back to
// /cart with an error query param so the cart page can surface a message.
//
// CartDrawer and CartPage both link here via <a href="/checkout"> (not Next.js
// Link) so the browser makes a full navigation request, which properly follows
// the 307 redirect to the Wix-hosted payment page.
//
// 307 is intentional: it is not cacheable by proxies, so every hit generates a
// fresh one-time Wix session URL rather than replaying a stale one.
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  try {
    const { fullUrl } = await initCheckout({
      thankYouPageUrl: `${origin}/order-confirmation`,
      cartPageUrl: `${origin}/cart`,
      postFlowUrl: `${origin}/`,
    });
    return NextResponse.redirect(fullUrl, { status: 307 });
  } catch (err) {
    await logWixFailure("checkout-route", "initCheckout", err);
    return NextResponse.redirect(
      new URL("/cart?checkout_error=1", req.url),
      { status: 307 },
    );
  }
}
