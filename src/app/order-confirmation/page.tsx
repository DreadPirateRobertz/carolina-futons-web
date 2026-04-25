import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MetaPurchaseTracker } from "@/components/analytics/MetaPurchaseTracker";
import { Ga4PurchaseTracker } from "@/components/analytics/Ga4PurchaseTracker";
import type { Ga4Item } from "@/lib/analytics/ga4-events";
import { getOrder } from "@/lib/wix/orders";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order Confirmation — Carolina Futons",
  robots: { index: false, follow: false },
};

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
  const shippingAddress = order.shippingInfo?.logistics?.shippingDestination?.address;
  const billingAddress = order.billingInfo?.address;

  // cf-3qt.7.3: derive Meta Pixel Purchase params from the resolved order.
  // priceSummary.total.amount is a stringified decimal per Wix conventions;
  // a non-numeric value means a malformed order — skip the event rather
  // than ship NaN to Meta (which would silently break Events Manager
  // reporting). Same guard for currency: skip if Wix returned no ISO code.
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
  // Meta + GA4 see identical attribution. Same trackability gate as Meta —
  // no fire on malformed totals or missing currency.
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
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
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
            shipping={Number.isFinite(shippingAmount) ? shippingAmount : undefined}
          />
        </>
      ) : null}
      <header>
        <p className="text-sm uppercase tracking-wide text-emerald-700">
          Order confirmed
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Thanks for your order
        </h1>
        {orderNumber ? (
          <p className="mt-1 text-zinc-600">Order #{orderNumber}</p>
        ) : null}
      </header>

      <section className="mt-8 rounded-lg border border-zinc-200">
        <h2 className="border-b border-zinc-200 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Items
        </h2>
        <ul className="divide-y divide-zinc-100">
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
                <div className="h-20 w-20 rounded bg-zinc-100" />
              )}
              <div className="flex-1">
                <p className="font-medium">{li.productName?.original ?? ""}</p>
                <p className="mt-1 text-sm text-zinc-600">
                  Qty {li.quantity ?? 1}
                </p>
              </div>
              <p className="text-sm text-zinc-700">
                {li.price?.formattedAmount ?? ""}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Totals
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            {subtotal ? (
              <Row label="Subtotal" value={subtotal} />
            ) : null}
            {shipping ? (
              <Row label="Shipping" value={shipping} />
            ) : null}
            {tax ? <Row label="Tax" value={tax} /> : null}
            {total ? (
              <Row label="Total" value={total} emphasize />
            ) : null}
          </dl>
        </div>

        <div className="rounded-lg border border-zinc-200 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Shipping
          </h2>
          <AddressBlock address={shippingAddress} />

          <h2 className="mt-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Billing
          </h2>
          <AddressBlock address={billingAddress} />
        </div>
      </section>

      <section className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/shop"
          className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Continue shopping
        </Link>
        {/* Phase 3 will wire guest→member conversion. */}
        <Link
          href="/signup"
          className="rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-900 hover:border-zinc-500"
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
          ? "flex justify-between border-t border-zinc-200 pt-2 text-base font-semibold"
          : "flex justify-between text-zinc-700"
      }
    >
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

type AnyAddress = {
  addressLine?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  subdivision?: string | null;
  postalCode?: string | null;
  country?: string | null;
} | undefined;

function AddressBlock({ address }: { address: AnyAddress }) {
  if (!address) return <p className="mt-2 text-sm text-zinc-500">—</p>;
  const parts = [
    address.addressLine,
    address.addressLine2,
    [address.city, address.subdivision, address.postalCode]
      .filter(Boolean)
      .join(", "),
    address.country,
  ].filter(Boolean) as string[];
  return (
    <address className="mt-2 space-y-0.5 text-sm not-italic text-zinc-700">
      {parts.map((line, i) => (
        <p key={i}>{line}</p>
      ))}
    </address>
  );
}
