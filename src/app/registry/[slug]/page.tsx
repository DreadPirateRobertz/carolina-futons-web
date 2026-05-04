import type { Metadata } from "next";
import Link from "next/link";
import { getPublicRegistryAction } from "@/app/actions/registry";
import { MarkPurchasedButton } from "@/components/registry/MarkPurchasedButton";
import { OCCASION_LABELS } from "@/lib/registry/registry-types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicRegistryAction(slug);
  if (!result.success) {
    return { title: "Registry — Carolina Futons", robots: { index: false } };
  }
  return {
    title: `${result.registry.title} — Carolina Futons Gift Registry`,
    description: result.registry.message ?? `Browse ${result.registry.title} and shop directly.`,
    robots: { index: false },
  };
}

export default async function PublicRegistryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getPublicRegistryAction(slug);

  if (!result.success) {
    return (
      <main
        className="mx-auto max-w-2xl px-4 py-16 text-center"
        data-testid="registry-not-found"
      >
        <h1 className="font-heading text-2xl font-semibold text-cf-espresso">
          Registry not found
        </h1>
        <p className="mt-3 text-cf-charcoal/60">
          This registry link may have expired or been made private.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-block rounded-md bg-cf-espresso px-5 py-2 text-sm font-medium text-white hover:bg-cf-espresso/90"
        >
          Browse products
        </Link>
      </main>
    );
  }

  const { registry } = result;
  const occasion = OCCASION_LABELS[registry.occasion] ?? registry.occasion;

  return (
    <main
      className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6"
      data-testid="registry-view"
    >
      <header className="mb-8 border-b border-cf-smoke pb-6">
        <h1 className="font-heading text-2xl font-semibold text-cf-espresso sm:text-3xl">
          {registry.title}
        </h1>
        <p className="mt-1 text-sm text-cf-charcoal/60">
          {occasion}
          {registry.eventDate
            ? ` · ${new Date(registry.eventDate).toLocaleDateString("en-US", { dateStyle: "long" })}`
            : ""}
        </p>
        {registry.message && (
          <p className="mt-3 max-w-2xl text-cf-charcoal/80 italic">
            &ldquo;{registry.message}&rdquo;
          </p>
        )}
      </header>

      {registry.items.length === 0 ? (
        <p className="text-cf-charcoal/60">No items added to this registry yet.</p>
      ) : (
        <ul
          role="list"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3"
          data-testid="registry-items"
        >
          {registry.items.map((item) => {
            const remaining = item.remaining ?? Math.max(0, item.quantity - item.purchasedQuantity);
            return (
              <li
                key={item._id}
                className="overflow-hidden rounded-lg border border-cf-smoke bg-white"
                data-testid="registry-item"
              >
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt={item.productName}
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <div className="aspect-square w-full bg-cf-sand/40" aria-hidden />
                )}
                <div className="p-3">
                  <p className="truncate text-sm font-medium text-cf-espresso">
                    {item.productName}
                  </p>
                  {item.productPrice > 0 && (
                    <p className="mt-0.5 text-sm text-cf-charcoal/60">
                      ${item.productPrice.toFixed(2)}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-cf-charcoal/50">
                    {remaining > 0
                      ? `${remaining} of ${item.quantity} still needed`
                      : "Fully purchased"}
                  </p>
                  {item.notes && (
                    <p className="mt-1 text-xs text-cf-charcoal/50 italic">{item.notes}</p>
                  )}
                  {item.productSlug && (
                    <Link
                      href={`/products/${item.productSlug}`}
                      className="mt-1 inline-block text-xs text-cf-espresso underline-offset-2 hover:underline"
                    >
                      View product
                    </Link>
                  )}
                  <MarkPurchasedButton itemId={item._id} remaining={remaining} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
