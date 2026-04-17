"use server";

import { headers } from "next/headers";
import { initCheckout } from "@/lib/wix/checkout";

export type CheckoutActionResult =
  | { ok: true; fullUrl: string; checkoutId: string }
  | { ok: false; error: string };

// Wix-hosted checkout collects billing/shipping, computes tax + shipping, and
// runs payment (Stripe/PayPal test mode in Phase 2). On success the visitor is
// redirected back to `/order-confirmation?orderId=...` which cf-3qt.2.5 renders.
export async function startCheckoutAction(): Promise<CheckoutActionResult> {
  try {
    const origin = await resolveOrigin();
    const { checkoutId, fullUrl } = await initCheckout({
      thankYouPageUrl: `${origin}/order-confirmation`,
      cartPageUrl: `${origin}/cart`,
      postFlowUrl: `${origin}/`,
    });
    return { ok: true, fullUrl, checkoutId };
  } catch (err) {
    return { ok: false, error: toMessage(err) };
  }
}

async function resolveOrigin(): Promise<string> {
  const envOrigin = process.env.NEXT_PUBLIC_SITE_URL;
  if (envOrigin) return envOrigin.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (!host) throw new Error("Unable to resolve request origin for checkout callbacks");
  return `${proto}://${host}`;
}

function toMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Unknown checkout error";
}
