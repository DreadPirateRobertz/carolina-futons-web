import Link from "next/link";

import type { MemberOrderSummary } from "@/lib/wix/orders";

export type OrderHistoryListProps = {
  orders: readonly MemberOrderSummary[];
  /**
   * The signed-in member's login email. Used to prefill the /track-order
   * lookup form so the customer doesn't have to retype the email Wix
   * keys the order on. Optional — `null` means the email is unavailable
   * (anonymous render or auth-edge case), in which case the per-order
   * "Track order" link is suppressed (the /track-order form requires
   * both orderNumber + email).
   */
  memberEmail?: string | null;
};

/**
 * Fulfillment statuses that mean the carrier has the package — either
 * fully or partially fulfilled. Wix's NOT_FULFILLED, CANCELED, and any
 * future status default to "no tracking available yet" semantics.
 */
const TRACKABLE_FULFILLMENT_STATUSES = new Set([
  "FULFILLED",
  "PARTIALLY_FULFILLED",
]);

// cf-m1vy: render the member's order history as a list of cards with
// date, total, status pills, and item count. Empty state owns its own
// copy + CTA so the page doesn't need to branch.
//
// cf-fd94 (cf-zn5b.1): shipped / partially-fulfilled orders carry a
// "Track order" link to `/track-order?orderNumber=…&email=…`. The link
// is suppressed when the order has no number, the member email is
// unavailable, or fulfillmentStatus indicates the package hasn't
// shipped yet — the /track-order page requires both fields and there's
// no point linking when one is absent.
export function OrderHistoryList({
  orders,
  memberEmail = null,
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

/**
 * Build the /track-order link href for an order that's eligible to show
 * tracking. Returns `null` when any required input is missing — callers
 * suppress the link entirely on null.
 *
 * @param order - The order summary row.
 * @param memberEmail - The member's login email (null = unavailable).
 * @returns The href string, or `null` if no link should render.
 */
export function buildTrackOrderHref(
  order: MemberOrderSummary,
  memberEmail: string | null | undefined,
): string | null {
  if (!order.number || !memberEmail) return null;
  if (!TRACKABLE_FULFILLMENT_STATUSES.has(order.fulfillmentStatus)) return null;
  return `/track-order?orderNumber=${encodeURIComponent(order.number)}&email=${encodeURIComponent(memberEmail)}`;
}

function OrderHistoryCard({
  order,
  memberEmail,
}: {
  order: MemberOrderSummary;
  memberEmail: string | null;
}) {
  const trackHref = buildTrackOrderHref(order, memberEmail);
  const orderLabel = order.number ? `Order #${order.number}` : "Order";
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
        <p className="mt-4">
          <Link
            href={trackHref}
            data-slot="order-track-link"
            className="inline-flex items-center text-sm font-medium text-cf-cta hover:underline"
          >
            Track order &rarr;
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
