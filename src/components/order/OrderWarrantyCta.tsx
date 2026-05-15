// cfw-lgc: Warranty-registration CTA shown on /order-confirmation.
// Bridges the post-purchase flow to the cfw-1ud /warranty/register
// form by pre-filling order + product params.
//
// WHY a server component: no interactivity (just a link), no client
// state. Server render keeps the order-confirmation page entirely
// streaming-server-rendered after the analytics trackers fire, and
// avoids an unnecessary hydration round-trip for what is structurally
// a static panel.

import Link from "next/link";

const REGISTER_BASE_PATH = "/warranty/register";

export type OrderWarrantyCtaProps = {
  /** Order id / number from the confirmation page — drives the ?orderId pre-fill. */
  orderId: string;
  /** Optional product id of the first / featured line item. */
  productId?: string;
  /** Optional product name of the first / featured line item. */
  productName?: string;
};

/**
 * Build the /warranty/register URL with the supplied pre-fill params.
 *
 * @param props The component props (orderId required, productId /
 *   productName optional).
 * @returns A URL string `"/warranty/register?orderId=…[&productId=…][&productName=…]"`
 *
 * WHY URLSearchParams: encodes spaces / em-dashes / `&` / `/` safely so
 * a product name like `"Cody — Loveseat & Mattress"` doesn't break the
 * downstream form's query parsing.
 */
function buildRegisterHref(props: OrderWarrantyCtaProps): string {
  const params = new URLSearchParams();
  params.set("orderId", props.orderId.trim());
  if (props.productId && props.productId.trim().length > 0) {
    params.set("productId", props.productId.trim());
  }
  if (props.productName && props.productName.trim().length > 0) {
    params.set("productName", props.productName.trim());
  }
  return `${REGISTER_BASE_PATH}?${params.toString()}`;
}

/**
 * Inline banner CTA shown on /order-confirmation linking to the
 * cfw-1ud warranty registration form with order pre-fill.
 *
 * @param props {@link OrderWarrantyCtaProps}.
 * @returns A `<section>` block with heading + body copy + CTA link,
 *   or `null` when no orderId is supplied (defensive — caller should
 *   only render this once `getOrder()` has resolved a real order).
 *
 * WHY the null-on-no-orderId guard: makes the component safe to drop
 * into a server page that doesn't have its orderId resolved yet (e.g.,
 * an error / unauthenticated branch). Same defensive pattern as the
 * Returns Portal's "no order" fall-through.
 */
export function OrderWarrantyCta(props: OrderWarrantyCtaProps) {
  if (!props.orderId || props.orderId.trim().length === 0) return null;

  const href = buildRegisterHref(props);

  return (
    <section
      data-slot="order-warranty-cta"
      className="rounded-md border border-cf-divider bg-cf-cream p-6 text-cf-ink"
    >
      <h2 className="font-playfair text-xl font-semibold tracking-tight">
        Register your warranty
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-cf-charcoal/85">
        Save the order on file so a future warranty claim moves faster.
        Takes a minute — we&apos;ll email a confirmation.
      </p>
      <Link
        href={href}
        className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-cf-cta px-5 text-sm font-medium text-white transition-colors hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Register warranty
      </Link>
    </section>
  );
}
