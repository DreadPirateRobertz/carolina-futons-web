"use client";

import Image from "next/image";

import { AddToCartButton } from "@/components/cart/AddToCartButton";
import type { MattressOption } from "@/lib/product/mattress-bundle";

const COMFORT_COLORS: Record<MattressOption["comfort"], string> = {
  Plush: "bg-cf-sand text-cf-espresso",
  Medium: "bg-cf-cta/10 text-cf-cta",
  Firm: "bg-cf-navy/10 text-cf-navy",
};

export function PdpMattressBundle({
  mattresses,
}: {
  mattresses: MattressOption[];
}) {
  if (mattresses.length === 0) return null;

  return (
    <section
      data-slot="pdp-mattress-bundle"
      aria-labelledby="mattress-bundle-heading"
      className="mt-10 rounded-xl border border-cf-divider bg-cf-cream/50 px-6 py-6"
    >
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-cf-cta">
        Complete your setup
      </p>
      <h2
        id="mattress-bundle-heading"
        className="mt-1 font-heading text-lg font-semibold text-cf-espresso"
      >
        Add a mattress
      </h2>
      <p className="mt-1 text-sm text-cf-charcoal/70">
        Every futon frame is designed to work with our Mesa collection.
      </p>

      <ul
        role="list"
        className="mt-5 grid gap-4 sm:grid-cols-3"
        aria-label="Mattress options"
      >
        {mattresses.map((m) => (
          <li
            key={m.id}
            data-comfort={m.comfort.toLowerCase()}
            className="flex flex-col rounded-lg border border-cf-divider bg-white p-4 shadow-sm dark:bg-cf-cream"
          >
            {m.imageUrl ? (
              <div className="relative mb-3 aspect-[4/3] w-full overflow-hidden rounded-md bg-cf-sand">
                <Image
                  src={m.imageUrl}
                  alt={m.name}
                  fill
                  sizes="(min-width: 640px) 20vw, 80vw"
                  className="object-cover"
                />
              </div>
            ) : null}

            <div className="flex-1">
              <span
                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${COMFORT_COLORS[m.comfort]}`}
              >
                {m.comfort}
              </span>
              <p className="mt-2 text-sm font-semibold text-cf-espresso">
                {m.name}
              </p>
              <p className="mt-0.5 text-xs text-cf-charcoal/60">{m.tagline}</p>
              <p className="mt-1 text-sm font-medium text-cf-espresso">
                {m.priceText}
              </p>
            </div>

            <div className="mt-3">
              <AddToCartButton
                productId={m.id}
                productName={m.name}
                unitPriceCents={m.unitPriceCents}
                formattedUnitPrice={m.priceText}
                productUrl={`/products/${m.slug}`}
                className="w-full"
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
