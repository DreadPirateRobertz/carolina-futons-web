import "server-only";
import { getWixClient } from "@/lib/wix-client";

// Derive WixOrder from the SDK client type — avoids a circular dependency that
// would arise from `NonNullable<Awaited<ReturnType<typeof getOrder>>>`.
type _WixClient = ReturnType<typeof getWixClient>;
export type WixOrder = NonNullable<
  Awaited<ReturnType<_WixClient["orders"]["getOrder"]>>
>;

const FIXTURE_ORDER_ID = "fixture-test-order";

// Minimal fixture order for NEXT_PUBLIC_USE_FIXTURE_PRODUCTS=1 E2E runs.
// Shape matches WixOrder fields consumed by OrderConfirmationPage.
const FIXTURE_ORDER = {
  _id: FIXTURE_ORDER_ID,
  number: "CF-FIXTURE-001",
  lineItems: [
    {
      _id: "li-1",
      productName: { original: "Kingston Futon Frame" },
      quantity: 1,
      price: { formattedAmount: "$399.00" },
      image: null,
    },
  ],
  priceSummary: {
    subtotal: { formattedAmount: "$399.00" },
    shipping: { formattedAmount: "$0.00" },
    tax: { formattedAmount: "$0.00" },
    total: { formattedAmount: "$399.00" },
  },
  shippingInfo: null,
  billingInfo: null,
} as const;

export async function getOrder(orderId: string): Promise<WixOrder | null> {
  if (!orderId) return null;
  if (
    process.env.NEXT_PUBLIC_USE_FIXTURE_PRODUCTS === "1" &&
    orderId === FIXTURE_ORDER_ID
  ) {
    return FIXTURE_ORDER as unknown as WixOrder;
  }
  const client = getWixClient();
  try {
    return await client.orders.getOrder(orderId);
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

function isNotFound(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const record = err as Record<string, unknown>;
  const details = (record.details ?? record) as Record<string, unknown>;
  const appErr = details?.applicationError as { code?: string } | undefined;
  if (appErr?.code === "NOT_FOUND") return true;
  const status = (record.status ?? details?.status) as number | undefined;
  return status === 404;
}
