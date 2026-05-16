/**
 * cf-54st: presentation component for the Velo lookupOrder response.
 * Pure-render: no client interactivity. Branches on success vs error
 * envelope and walks the timeline + shipping + items per the Velo
 * orderTracking.web.js response shape.
 */
import type { TrackOrderResponse } from "@/lib/wix/track-order";

export type TrackOrderResultProps = {
  response: TrackOrderResponse;
};

export function TrackOrderResult({ response }: TrackOrderResultProps) {
  if (!response.success) {
    return (
      <p
        role="alert"
        data-testid="track-order-error"
        className="rounded-lg border border-cf-divider bg-white p-6 text-sm text-red-600 dark:bg-cf-cream"
      >
        {response.error}
      </p>
    );
  }

  const { order, shipping, timeline, items } = response;

  return (
    <div data-testid="track-order-result" className="space-y-8">
      <section
        aria-labelledby="track-order-summary-heading"
        data-slot="track-order-summary"
        className="rounded-lg border border-cf-divider bg-white p-5 dark:bg-cf-cream"
      >
        <h2
          id="track-order-summary-heading"
          className="font-heading text-xl font-semibold text-cf-ink"
        >
          {order.number ? `Order #${order.number}` : "Order"}
        </h2>
        <dl className="mt-4 grid gap-y-1 text-sm sm:grid-cols-3">
          <Pair label="Status" value={order.status} />
          <Pair label="Payment" value={order.paymentStatus} />
          <Pair label="Fulfillment" value={order.fulfillmentStatus} />
        </dl>
        {order.statusDescription ? (
          <p className="mt-3 text-sm text-cf-muted">
            {order.statusDescription}
          </p>
        ) : null}
      </section>

      {shipping.trackingNumber ? (
        <section
          aria-labelledby="track-order-shipping-heading"
          data-slot="track-order-shipping"
          className="rounded-lg border border-cf-divider bg-white p-5 dark:bg-cf-cream"
        >
          <h2
            id="track-order-shipping-heading"
            className="font-heading text-lg font-semibold text-cf-ink"
          >
            Shipping
          </h2>
          <dl className="mt-4 grid gap-y-1 text-sm sm:grid-cols-2">
            {shipping.carrier ? (
              <Pair label="Carrier" value={shipping.carrier} />
            ) : null}
            {shipping.serviceName ? (
              <Pair label="Service" value={shipping.serviceName} />
            ) : null}
            <Pair
              label="Tracking number"
              value={shipping.trackingNumber}
              testId="track-order-tracking-number"
            />
            {shipping.estimatedDelivery ? (
              <Pair
                label="Estimated delivery"
                value={shipping.estimatedDelivery}
              />
            ) : null}
          </dl>
        </section>
      ) : null}

      {timeline && timeline.length > 0 ? (
        <section
          aria-labelledby="track-order-timeline-heading"
          data-slot="track-order-timeline"
          className="rounded-lg border border-cf-divider bg-white p-5 dark:bg-cf-cream"
        >
          <h2
            id="track-order-timeline-heading"
            className="font-heading text-lg font-semibold text-cf-ink"
          >
            Timeline
          </h2>
          <ol className="mt-4 space-y-2" aria-label="Order timeline">
            {timeline.map((step) => (
              <li
                key={step.step}
                data-testid="track-order-timeline-step"
                data-completed={step.completed ? "true" : "false"}
                data-current={step.current ? "true" : "false"}
                className="flex items-baseline gap-3 text-sm"
              >
                <span
                  aria-hidden="true"
                  className={
                    step.completed
                      ? "h-2 w-2 rounded-full bg-cf-cta"
                      : "h-2 w-2 rounded-full border border-cf-divider"
                  }
                />
                <span
                  className={
                    step.current
                      ? "font-semibold text-cf-ink"
                      : "text-cf-ink"
                  }
                >
                  {step.label}
                </span>
                {step.description ? (
                  <span className="text-cf-muted">{step.description}</span>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {items && items.length > 0 ? (
        <section
          aria-labelledby="track-order-items-heading"
          data-slot="track-order-items"
          className="rounded-lg border border-cf-divider bg-white p-5 dark:bg-cf-cream"
        >
          <h2
            id="track-order-items-heading"
            className="font-heading text-lg font-semibold text-cf-ink"
          >
            Items
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            {items.map((item, i) => (
              <li key={`${item.name}-${i}`} className="flex justify-between gap-3">
                <span className="text-cf-ink">{item.name}</span>
                {item.quantity ? (
                  <span className="text-cf-muted">× {item.quantity}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Pair({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId?: string;
}) {
  return (
    <div className="flex gap-1.5 sm:flex-col sm:gap-0">
      <dt className="text-xs uppercase tracking-wide text-cf-muted">{label}</dt>
      <dd className="text-cf-ink" data-testid={testId}>
        {value}
      </dd>
    </div>
  );
}
