import "server-only";
import type { Tokens } from "@wix/sdk";
import { getWixClient, getWixClientWithTokens } from "@/lib/wix-client";

export async function getOrder(orderId: string) {
  if (!orderId) return null;
  const client = getWixClient();
  try {
    return await client.orders.getOrder(orderId);
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

export type WixOrder = NonNullable<Awaited<ReturnType<typeof getOrder>>>;

export type MemberOrderSummary = {
  id: string;
  number: string | null;
  createdDate: string | null;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  totalFormatted: string | null;
  totalValue: number | null;
  currency: string | null;
  itemCount: number;
};

// cf-m1vy: list a member's orders for the dashboard view.
//
// searchOrders filters by buyerInfo.contactId — the Wix-side identifier the
// ecom platform uses to attribute orders to a buyer. Member tokens encode
// the member identity but Wix orders are keyed on the underlying contact,
// so callers pass the contactId resolved from getCurrentMember().
//
// Returns a flattened summary shape rather than the raw SDK Order so the
// dashboard view doesn't need to thread Wix's nested money/status types
// through to the JSX. Errors are caught and surfaced as an empty list +
// console.error — the page renders an empty state rather than 500'ing.
export async function getOrdersForMember(args: {
  contactId: string;
  tokens: Tokens;
  limit?: number;
}): Promise<MemberOrderSummary[]> {
  if (!args.contactId) return [];
  const client = getWixClientWithTokens(args.tokens);
  const limit = args.limit ?? 25;

  let response;
  try {
    response = await client.orders.searchOrders({
      filter: { "buyerInfo.contactId": args.contactId },
      sort: [{ fieldName: "_createdDate", order: "DESC" }],
      cursorPaging: { limit },
    });
  } catch (err) {
    console.error("[orders] searchOrders failed:", err);
    return [];
  }

  const orders = (response?.orders ?? []) as Record<string, unknown>[];
  return orders.map(toSummary);
}

function toSummary(order: Record<string, unknown>): MemberOrderSummary {
  const id = (order._id as string | undefined) ?? "";
  const number = (order.number as string | undefined) ?? null;
  const createdDate = (order._createdDate as string | undefined) ?? null;
  const status = (order.status as string | undefined) ?? "UNKNOWN";
  const paymentStatus =
    (order.paymentStatus as string | undefined) ?? "UNKNOWN";
  const fulfillmentStatus =
    (order.fulfillmentStatus as string | undefined) ?? "UNKNOWN";

  const priceSummary =
    (order.priceSummary as Record<string, unknown> | undefined) ?? null;
  const total =
    (priceSummary?.total as Record<string, unknown> | undefined) ?? null;
  const totalFormatted = (total?.formattedAmount as string | undefined) ?? null;
  const totalValueRaw = total?.amount as string | number | undefined;
  const totalValue =
    typeof totalValueRaw === "number"
      ? totalValueRaw
      : typeof totalValueRaw === "string"
        ? Number.parseFloat(totalValueRaw)
        : null;
  const currency = (order.currency as string | undefined) ?? null;

  const lineItems = (order.lineItems as unknown[] | undefined) ?? [];
  const itemCount = lineItems.reduce<number>((sum, item) => {
    const qty = (item as { quantity?: number }).quantity;
    return sum + (typeof qty === "number" ? qty : 1);
  }, 0);

  return {
    id,
    number,
    createdDate,
    status,
    paymentStatus,
    fulfillmentStatus,
    totalFormatted,
    totalValue: typeof totalValue === "number" && Number.isFinite(totalValue)
      ? totalValue
      : null,
    currency,
    itemCount,
  };
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
