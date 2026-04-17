import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
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

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
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
