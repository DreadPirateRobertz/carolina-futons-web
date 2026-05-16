import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MetaPurchaseTracker } from "@/components/analytics/MetaPurchaseTracker";
import { Ga4PurchaseTracker } from "@/components/analytics/Ga4PurchaseTracker";
import { NewsletterSignup } from "@/components/site/NewsletterSignup";
import { OrderWarrantyCta } from "@/components/order/OrderWarrantyCta";
import type { Ga4Item } from "@/lib/analytics/ga4-events";
import { getOrder } from "@/lib/wix/orders";
import { BUSINESS, SOCIALS } from "@/lib/business/contact-info";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order Confirmation — Carolina Futons",
  robots: { index: false, follow: false },
};

const DELIVERY_STEPS = [
  {
    label: "Order received",
    detail: "We've got it — you'll get a confirmation email shortly.",
  },
  {
    label: "Handcrafted & packed",
    detail: "Our Hendersonville team builds and inspects your futon.",
  },
  {
    label: "Shipped",
    detail: "Tracking info will arrive by email once it's on its way.",
  },
  { label: "Delivered", detail: "Sit back and enjoy your new Carolina Futon." },
] as const;

const SHARE_SOCIALS = SOCIALS.filter((s) =>
  ["Facebook", "Pinterest", "Instagram"].includes(s.name),
);

export default async function OrderConfirmationPage(props: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await props.searchParams;
  if (!orderId) redirect("/shop?error=missing-order-id");

  const order = await getOrder(orderId);
  if (!order) redirect("/shop?error=order-not-found");

  const lineItems = order.lineItems ?? [];
  const total = order.priceSummary?.total?.formattedAmount ?? "";
  const subtotal = order.priceSummary?.subtotal?.formattedAmount ?? "";
  const shipping = order.priceSummary?.shipping?.formattedAmount ?? "";
  const tax = order.priceSummary?.tax?.formattedAmount ?? "";
  const orderNumber = order.number ?? order._id ?? "";
  const shippingAddress =
    order.shippingInfo?.logistics?.shippingDestination?.address;
  const billingAddress = order.billingInfo?.address;

  // cf-3qt.7.3: priceSummary.total.amount is a stringified decimal per Wix conventions;
  // skip the event rather than ship NaN to Meta (silently breaks Events Manager reporting).
  // Same guard for currency: skip if Wix returned no ISO code.
  const totalAmountRaw = order.priceSummary?.total?.amount ?? "";
  const totalAmount = Number(totalAmountRaw);
  const orderCurrency = order.currency ?? "";
  const purchaseTrackable =
    Number.isFinite(totalAmount) &&
    totalAmount > 0 &&
    /^[A-Z]{3}$/.test(orderCurrency);
  const purchaseContentIds = lineItems
    .map((li) => li.catalogReference?.catalogItemId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  // cf-o4ws: derive GA4 purchase items from the same lineItems source so
  // Meta + GA4 see identical attribution. Same trackability gate as Meta.
  const ga4Items: Ga4Item[] = [];
  for (const li of lineItems) {
    const itemId = li.catalogReference?.catalogItemId;
    if (typeof itemId !== "string" || itemId.length === 0) continue;
    const priceRaw = li.priceBeforeDiscounts?.amount ?? li.price?.amount;
    const priceNum = typeof priceRaw === "string" ? Number(priceRaw) : NaN;
    const productName =
      (typeof li.productName === "string"
        ? li.productName
        : li.productName?.original) ?? "";
    ga4Items.push({
      item_id: itemId,
      item_name: productName,
      price: Number.isFinite(priceNum) ? priceNum : 0,
      quantity: typeof li.quantity === "number" ? li.quantity : 1,
    });
  }
  const taxAmount = Number(order.priceSummary?.tax?.amount ?? "");
  const shippingAmount = Number(order.priceSummary?.shipping?.amount ?? "");

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 font-source-sans">
      {purchaseTrackable ? (
        <>
          <MetaPurchaseTracker
            value={totalAmount}
            currency={orderCurrency}
            contentIds={purchaseContentIds}
            orderId={orderNumber || undefined}
          />
          <Ga4PurchaseTracker
            transactionId={orderNumber || String(order._id ?? "")}
            value={totalAmount}
            currency={orderCurrency}
            items={ga4Items}
            tax={Number.isFinite(taxAmount) ? taxAmount : undefined}
            shipping={
              Number.isFinite(shippingAmount) ? shippingAmount : undefined
            }
          />
        </>
      ) : null}

      <header>
        <p className="text-sm font-medium uppercase tracking-[0.15em] text-cf-cta">
          Order confirmed
        </p>
        <h1 className="mt-2 font-playfair text-3xl font-semibold tracking-tight text-cf-ink">
          Thanks for your order
        </h1>
        {orderNumber ? (
          <p className="mt-1 text-cf-muted">Order #{orderNumber}</p>
        ) : null}
      </header>

      {/* Brenda message */}
      <section
        data-testid="brenda-message"
        className="mt-8 rounded-lg border border-cf-blue/20 bg-cf-sand p-6"
      >
        <p className="font-playfair text-lg font-semibold text-cf-ink">
          A note from Brenda
        </p>
        <p className="mt-2 leading-relaxed text-cf-ink">
          Every futon that leaves our shop in Hendersonville is built by hand —
          the same way we&rsquo;ve been doing it since {BUSINESS.foundedYear}.
          Thank you for trusting us with your home. If you ever have a question,
          just give us a call at{" "}
          <a
            href={BUSINESS.phoneHref}
            className="font-medium text-cf-cta underline underline-offset-2 hover:text-cf-cta/80"
          >
            {BUSINESS.phone}
          </a>
          . — Brenda &amp; the {BUSINESS.name} team
        </p>
      </section>

      {/* Delivery timeline */}
      <section data-testid="delivery-timeline" className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-cf-muted">
          What happens next
        </h2>
        <ol className="mt-4 space-y-4">
          {DELIVERY_STEPS.map((step, i) => (
            <li key={step.label} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cf-cta text-sm font-semibold text-white">
                {i + 1}
              </span>
              <div className="pt-0.5">
                <p className="font-medium text-cf-ink">{step.label}</p>
                <p className="mt-0.5 text-sm text-cf-muted">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Items */}
      <section className="mt-8 rounded-lg border border-cf-ink/10 dark:border-cf-cream/10">
        <h2 className="border-b border-cf-ink/10 dark:border-cf-cream/10 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-cf-muted">
          Items
        </h2>
        <ul className="divide-y divide-cf-ink/5">
          {lineItems.map((li) => (
            <li key={li._id} className="flex gap-4 px-5 py-4">
              {li.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={li.image}
                  alt={li.productName?.original ?? ""}
                  className="h-20 w-20 rounded object-cover"
                />
              ) : (
                <div className="h-20 w-20 rounded bg-cf-sand" />
              )}
              <div className="flex-1">
                <p className="font-medium text-cf-ink">
                  {li.productName?.original ?? ""}
                </p>
                <p className="mt-1 text-sm text-cf-muted">
                  Qty {li.quantity ?? 1}
                </p>
              </div>
              <p className="text-sm text-cf-ink">
                {li.price?.formattedAmount ?? ""}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* Totals + Addresses */}
      <section className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-cf-ink/10 dark:border-cf-cream/10 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-cf-muted">
            Totals
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            {subtotal ? <Row label="Subtotal" value={subtotal} /> : null}
            {shipping ? <Row label="Shipping" value={shipping} /> : null}
            {tax ? <Row label="Tax" value={tax} /> : null}
            {total ? <Row label="Total" value={total} emphasize /> : null}
          </dl>
        </div>

        <div className="rounded-lg border border-cf-ink/10 dark:border-cf-cream/10 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-cf-muted">
            Shipping
          </h2>
          <AddressBlock address={shippingAddress} />

          <h2 className="mt-4 text-sm font-semibold uppercase tracking-wide text-cf-muted">
            Billing
          </h2>
          <AddressBlock address={billingAddress} />
        </div>
      </section>

      {/* Social share — hidden if contact-info.ts renames/removes any platform */}
      {SHARE_SOCIALS.length > 0 ? (
        <section
          data-testid="social-share"
          className="mt-8 rounded-lg border border-cf-ink/10 dark:border-cf-cream/10 p-5 text-center"
        >
          <p className="font-medium text-cf-ink">
            Love your new futon? Share it!
          </p>
          <p className="mt-1 text-sm text-cf-muted">
            Show us how it looks in your home — tag us and you might be
            featured.
          </p>
          <div className="mt-4 flex justify-center gap-4">
            {SHARE_SOCIALS.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-cf-ink/15 dark:border-cf-cream/15 px-4 py-2 text-sm font-medium text-cf-ink hover:border-cf-cta hover:text-cf-cta"
              >
                {s.name}
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {/* cfw-lgc: Warranty registration CTA — pre-fills the
          /warranty/register form with the order context. Renders null
          when orderNumber is empty (defensive). */}
      <div className="mt-8">
        <OrderWarrantyCta
          orderId={orderNumber}
          productId={lineItems[0]?.catalogReference?.catalogItemId ?? undefined}
          productName={
            typeof lineItems[0]?.productName === "string"
              ? lineItems[0]?.productName
              : lineItems[0]?.productName?.original ?? undefined
          }
        />
      </div>

      {/* Newsletter */}
      <section
        data-testid="newsletter-section"
        className="mt-8 rounded-lg bg-cf-navy px-6 py-8 text-center text-white"
      >
        <p className="font-playfair text-xl font-semibold">
          Stay in the family
        </p>
        <p className="mt-2 text-sm text-white/80">
          Get care tips, new arrivals, and Hendersonville-made exclusives.
        </p>
        <div className="mt-5">
          <NewsletterSignup />
        </div>
      </section>

      {/* CTA row */}
      <section className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/shop"
          className="rounded-md bg-cf-cta px-5 py-2.5 text-sm font-medium text-white hover:bg-cf-cta/90"
        >
          Continue shopping
        </Link>
        <Link
          href="/signup"
          className="rounded-md border border-cf-ink/20 dark:border-cf-cream/20 px-5 py-2.5 text-sm font-medium text-cf-ink hover:border-cf-cta"
        >
          Create an account
        </Link>
      </section>
    </main>
  );
}

function Row({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={
        emphasize
          ? "flex justify-between border-t border-cf-ink/10 dark:border-cf-cream/10 pt-2 text-base font-semibold text-cf-ink"
          : "flex justify-between text-cf-ink"
      }
    >
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

type AnyAddress =
  | {
      addressLine?: string | null;
      addressLine2?: string | null;
      city?: string | null;
      subdivision?: string | null;
      postalCode?: string | null;
      country?: string | null;
    }
  | undefined;

function AddressBlock({ address }: { address: AnyAddress }) {
  if (!address) return <p className="mt-2 text-sm text-cf-muted">—</p>;
  const parts = [
    address.addressLine,
    address.addressLine2,
    [address.city, address.subdivision, address.postalCode]
      .filter(Boolean)
      .join(", "),
    address.country,
  ].filter(Boolean) as string[];
  return (
    <address className="mt-2 space-y-0.5 text-sm not-italic text-cf-ink">
      {parts.map((line, i) => (
        <p key={i}>{line}</p>
      ))}
    </address>
  );
}
