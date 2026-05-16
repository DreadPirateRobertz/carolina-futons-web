/**
 * cf-54st (cf-fd94.fu1): /track-order destination for the order-history
 * tracking link (cf-fd94 G-7). Consumes the Velo lookupOrder HTTP wrapper
 * (cf-54st.1).
 *
 * Query params:
 *   - n=<orderNumber>  (cf-fd94 link emits this)
 *   - e=<email>        (compound key — Velo side enforces ownership)
 *
 * The page is open to anyone with the link — auth happens inside the
 * Velo backend by matching the supplied email against the order's
 * buyerInfo.email. cf-3ldu.1 rate-limits the underlying lookup on a
 * (email:orderNumber) compound key so a stolen number alone can't
 * enumerate.
 */

import type { Metadata } from "next";

import { TrackOrderResult } from "@/components/track-order/TrackOrderResult";
import {
  lookupOrderViaVelo,
  VeloRpcError,
  type TrackOrderResponse,
} from "@/lib/wix/track-order";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Track your order — Carolina Futons",
  description:
    "Look up tracking and delivery status for your Carolina Futons order.",
  robots: { index: false, follow: false },
};

type SearchParams = Record<string, string | string[] | undefined>;

function readParam(
  params: SearchParams,
  key: string,
): string | null {
  const raw = params[key];
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0];
  return null;
}

export default async function TrackOrderPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const orderNumber = readParam(params, "n");
  const email = readParam(params, "e");

  // Missing params → render the empty-state heading + brief copy.
  // The order-history dashboard always passes both, but a customer who
  // bookmarks the URL or types it manually should see clear guidance
  // rather than a generic 404.
  if (!orderNumber || !email) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="font-heading text-3xl font-semibold text-cf-ink">
          Track your order
        </h1>
        <p
          data-testid="track-order-missing-params"
          className="mt-4 text-sm text-cf-muted"
        >
          Use the link from your order-confirmation email or from your
          account&apos;s order history. The link contains both the order
          number and your email so we can verify the lookup.
        </p>
      </main>
    );
  }

  let response: TrackOrderResponse;
  try {
    response = await lookupOrderViaVelo(orderNumber, email);
  } catch (err) {
    // VeloRpcError surfaces as a network/transport failure (the Velo
    // backend itself is unreachable). Surface a distinct copy from the
    // business-error path so the customer knows to retry rather than
    // re-check their order number.
    if (err instanceof VeloRpcError) {
      return (
        <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
          <h1 className="font-heading text-3xl font-semibold text-cf-ink">
            Track your order
          </h1>
          <p
            data-testid="track-order-transport-error"
            className="mt-4 text-sm text-red-600"
          >
            We couldn&rsquo;t reach the order-tracking service right now.
            Please refresh the page in a moment or call us at (828) 252-9449.
          </p>
        </main>
      );
    }
    throw err;
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mb-8">
        <h1 className="font-heading text-3xl font-semibold text-cf-ink">
          Track your order
        </h1>
      </header>
      <TrackOrderResult response={response} />
    </main>
  );
}
