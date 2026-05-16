import { NextResponse, type NextRequest } from "next/server";

import { initCheckout } from "@/lib/wix/checkout";
import { logError } from "@/lib/logging/log-error";

// GET /checkout — creates a Wix checkout from the current cart and redirects
// the browser to the Wix-hosted payment page. On failure, bounces back to
// /cart with an error query param so the cart page can surface a message.
//
// CartDrawer and CartPage both link here. The 307 preserves method so any
// future POST flow can follow the same route.
//
// Fixture mode (NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1): skips Wix checkout and
// redirects to /order-confirmation so E2E smoke tests can complete the flow.
export async function GET(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS === "1") {
    return NextResponse.redirect(
      new URL("/order-confirmation?orderId=fixture-test-order", req.url),
      { status: 307 },
    );
  }
  const origin = req.nextUrl.origin;
  try {
    const { fullUrl } = await initCheckout({
      thankYouPageUrl: `${origin}/order-confirmation`,
      cartPageUrl: `${origin}/cart`,
      postFlowUrl: `${origin}/`,
    });
    return NextResponse.redirect(fullUrl, { status: 307 });
  } catch (err) {
    // cfw-jype: initCheckout failure ships to Sentry via the shared
    // logger. Recovery flow unchanged — bounce back to /cart with
    // ?checkout_error=1 so the cart page can surface a banner.
    await logError("checkout", "initCheckout", err);
    return NextResponse.redirect(
      new URL("/cart?checkout_error=1", req.url),
      { status: 307 },
    );
  }
}
