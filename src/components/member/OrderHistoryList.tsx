import type { MemberOrderSummary } from "@/lib/wix/orders";

export type OrderHistoryListProps = {
  orders: readonly MemberOrderSummary[];
};

// cf-m1vy: render the member's order history as a list of cards with
// date, total, status pills, and item count. Empty state owns its own
// copy + CTA so the page doesn't need to branch.
export function OrderHistoryList({ orders }: OrderHistoryListProps) {
  if (orders.length === 0) {
    return (
      <div
        data-slot="order-history-empty"
        className="rounded-lg border border-cf-divider bg-white p-8 text-center"
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
          <OrderHistoryCard order={order} />
        </li>
      ))}
    </ul>
  );
}

function OrderHistoryCard({ order }: { order: MemberOrderSummary }) {
  const orderLabel = order.number ? `Order #${order.number}` : "Order";
  return (
    <article
      data-slot="order-history-card"
      data-order-id={order.id}
      className="rounded-lg border border-cf-divider bg-white p-5"
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
