import "server-only";
import { getWixClient } from "@/lib/wix-client";

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

function isNotFound(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const record = err as Record<string, unknown>;
  const details = (record.details ?? record) as Record<string, unknown>;
  const appErr = details?.applicationError as { code?: string } | undefined;
  if (appErr?.code === "NOT_FOUND") return true;
  const status = (record.status ?? details?.status) as number | undefined;
  return status === 404;
}
