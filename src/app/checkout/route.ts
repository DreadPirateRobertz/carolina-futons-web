import { NextResponse, type NextRequest } from "next/server";

import { initCheckout } from "@/lib/wix/checkout";

// GET /checkout — creates a Wix checkout from the current cart and redirects
// the browser to the Wix-hosted payment page. On failure, bounces back to
// /cart with an error query param so the cart page can surface a message.
//
// CartDrawer and CartPage both link here. The 307 preserves method so any
// future POST flow can follow the same route.
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
    console.error("[checkout] initCheckout failed", err);
    return NextResponse.redirect(
      new URL("/cart?checkout_error=1", req.url),
      { status: 307 },
    );
  }
}
