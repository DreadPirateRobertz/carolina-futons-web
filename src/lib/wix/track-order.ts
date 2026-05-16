/**
 * cf-54st (cf-fd94.fu1): typed wrapper around the Velo lookupOrder
 * HTTP endpoint (cf-54st.1 / post_lookupOrder).
 *
 * Server-only — every call goes through callVelo and is invoked
 * from a Server Component or Server Action. Anonymous-eligible (the
 * Velo webMethod is Permissions.Anyone) because the cf-fd94 entry
 * point comes from email links + the order-history dashboard, both
 * of which already verify identity via the orderNumber + email
 * compound key on the Velo side.
 */
import "server-only";

import { callVelo, VeloRpcError } from "@/lib/wix/velo-client";

export type TrackOrderTimelineStep = {
  step: number;
  label: string;
  description?: string;
  completed: boolean;
  current: boolean;
};

export type TrackOrderShippingAddress = {
  city: string;
  state: string;
};

export type TrackOrderItem = {
  name: string;
  image: string | null;
  quantity?: number;
};

export type TrackOrderResponse =
  | {
      success: true;
      order: {
        number: string | null;
        createdDate: string | null;
        status: string;
        statusDescription?: string;
        fulfillmentStatus: string;
        paymentStatus: string;
      };
      shipping: {
        carrier: string | null;
        serviceName: string | null;
        trackingNumber: string | null;
        estimatedDelivery: string | null;
        shippingAddress?: TrackOrderShippingAddress;
      };
      timeline?: TrackOrderTimelineStep[];
      items?: TrackOrderItem[];
      notificationsEnabled?: boolean;
    }
  | {
      success: false;
      error: string;
    };

/**
 * Look up an order by `(orderNumber, email)` via the Velo HTTP
 * wrapper. Returns the response envelope verbatim — call sites
 * branch on `success`.
 *
 * Network / parse errors propagate as `VeloRpcError`; that case is
 * distinct from a `{success: false, error: …}` business response.
 */
export async function lookupOrderViaVelo(
  orderNumber: string,
  email: string,
): Promise<TrackOrderResponse> {
  return (await callVelo({
    method: "lookupOrder",
    args: [orderNumber, email],
  })) as TrackOrderResponse;
}

export { VeloRpcError };
