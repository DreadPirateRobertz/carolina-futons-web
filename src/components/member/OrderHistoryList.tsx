import Link from "next/link";

import type { MemberOrderSummary } from "@/lib/wix/orders";

export type OrderHistoryListProps = {
  orders: readonly MemberOrderSummary[];
  // cf-fd94 (cf-zn5b.1 G-7): the per-row Track-shipment link needs both
  // orderNumber + memberEmail to construct the /track-order lookup URL.
  // Optional so the existing (pre-G-7) callers without email still render.
  memberEmail?: string | null;
};

// cf-m1vy: render the member's order history as a list of cards with
// date, total, status pills, and item count. Empty state owns its own
// copy + CTA so the page doesn't need to branch.
export function OrderHistoryList({
  orders,
  memberEmail,
}: OrderHistoryListProps) {
  if (orders.length === 0) {
    return (
      <div
        data-slot="order-history-empty"
        className="rounded-lg border border-cf-divider bg-white p-8 text-center dark:bg-cf-cream"
      >
        <p className="text-sm text-cf-muted">
          You haven&rsquo;t placed an order yet. Once you do, the receipt
          will live here.
        </p>
      </div>
    );
  }

  return (
    <ul
      data-slot="order-history-list"
      className="space-y-4"
      aria-label="Order history"
    >
      {orders.map((order) => (
        <li key={order.id}>
          <OrderHistoryCard order={order} memberEmail={memberEmail} />
        </li>
      ))}
    </ul>
  );
}

// cf-fd94: render a per-order "Track shipment" link when the order is
// fulfilled AND we have both an order number + the member's email (the
// /track-order lookup needs both to verify ownership before exposing
// tracking data). Returns null otherwise so unshipped orders, orders
// without numbers, and unauthenticated views all skip the link cleanly.
function trackShipmentHref(
  order: MemberOrderSummary,
  memberEmail: string | null | undefined,
): string | null {
  if (order.fulfillmentStatus !== "FULFILLED") return null;
  if (!order.number) return null;
  if (!memberEmail) return null;
  const params = new URLSearchParams({ n: order.number, e: memberEmail });
  return `/track-order?${params.toString()}`;
}

function OrderHistoryCard({
  order,
  memberEmail,
}: {
  order: MemberOrderSummary;
  memberEmail: string | null | undefined;
}) {
  const orderLabel = order.number ? `Order #${order.number}` : "Order";
  const trackHref = trackShipmentHref(order, memberEmail);
  return (
    <article
      data-slot="order-history-card"
      data-order-id={order.id}
      className="rounded-lg border border-cf-divider bg-white p-5 dark:bg-cf-cream"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="font-medium text-cf-ink">{orderLabel}</p>
          {order.createdDate ? (
            <p className="text-xs text-cf-muted">
              Placed{" "}
              <time dateTime={order.createdDate}>
                {formatOrderDate(order.createdDate)}
              </time>
            </p>
          ) : null}
        </div>
        {order.totalFormatted ? (
          <p
            data-slot="order-total"
            className="text-base font-semibold text-cf-ink"
          >
            {order.totalFormatted}
          </p>
        ) : null}
      </header>

      <dl className="mt-4 grid gap-y-1 text-sm sm:grid-cols-3">
        <StatusPair label="Status" value={humanizeStatus(order.status)} />
        <StatusPair
          label="Payment"
          value={humanizeStatus(order.paymentStatus)}
        />
        <StatusPair
          label="Fulfillment"
          value={humanizeStatus(order.fulfillmentStatus)}
        />
      </dl>

      {order.itemCount > 0 ? (
        <p className="mt-3 text-xs text-cf-muted">
          {order.itemCount === 1 ? "1 item" : `${order.itemCount} items`}
        </p>
      ) : null}

      {trackHref ? (
        <p className="mt-3">
          <Link
            href={trackHref}
            data-slot="order-track-link"
            className="rounded-sm text-sm font-medium text-cf-cta underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2"
          >
            Track shipment →
          </Link>
        </p>
      ) : null}
    </article>
  );
}

function StatusPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5 sm:flex-col sm:gap-0">
      <dt className="text-xs uppercase tracking-wide text-cf-muted">
        {label}
      </dt>
      <dd className="text-cf-ink">{value}</dd>
    </div>
  );
}

function humanizeStatus(status: string): string {
  if (!status) return "—";
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatOrderDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
