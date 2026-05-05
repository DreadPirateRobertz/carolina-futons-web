"use client";

// Public / shareable registry view (cf-l6aj.16).
// Reads from localStorage — same-device sharing only for v1.
// A "Registry not found" state is shown when the id isn't in local storage
// (different device, cleared storage, or bad link).

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gift } from "lucide-react";
import { getRegistry } from "@/lib/registry/registry-storage";
import { OCCASION_LABELS, type RegistryDetail } from "@/lib/registry/registry-types";
import { RegistryShareButton } from "@/components/gift-registry/RegistryShareButton";

export default function RegistryPublicPage({
  params,
}: {
  params: { id: string };
}) {
  const [registry, setRegistry] = useState<RegistryDetail | null | "loading">(
    "loading",
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage unavailable during SSR
    setRegistry(getRegistry(window.localStorage, params.id));
  }, [params.id]);

  if (registry === "loading") {
    return (
      <main id="main" className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        <p className="text-cf-charcoal/50">Loading…</p>
      </main>
    );
  }

  if (!registry) {
    return (
      <main
        id="main"
        data-slot="registry-not-found"
        className="mx-auto w-full max-w-2xl px-4 py-16 text-center sm:px-6"
      >
        <Gift className="mx-auto size-10 text-cf-charcoal/20" aria-hidden="true" />
        <h1 className="mt-4 font-heading text-2xl font-semibold text-cf-espresso">
          Registry not found
        </h1>
        <p className="mt-2 text-sm text-cf-charcoal/60">
          This registry link only works on the device where it was created.
        </p>
        <Link
          href="/gift-registry"
          className="mt-6 inline-block rounded-lg bg-cf-espresso px-5 py-2.5 text-sm font-semibold text-white hover:bg-cf-espresso/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-navy"
        >
          View your registries
        </Link>
      </main>
    );
  }

  return (
    <main
      id="main"
      data-slot="registry-public-view"
      className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 sm:py-16"
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-cf-charcoal/50">
            {OCCASION_LABELS[registry.occasion]}
            {registry.eventDate ? ` · ${registry.eventDate}` : ""}
          </p>
          <h1 className="mt-1 font-heading text-3xl font-semibold tracking-tight text-cf-espresso">
            {registry.title}
          </h1>
          {registry.message && (
            <p className="mt-2 text-sm text-cf-charcoal/70">{registry.message}</p>
          )}
        </div>
        <RegistryShareButton registryId={registry._id} />
      </div>

      {registry.items.length === 0 ? (
        <div
          data-slot="registry-items-empty"
          className="rounded-xl border border-dashed border-cf-divider px-6 py-10 text-center"
        >
          <p className="text-sm text-cf-charcoal/60">
            No items added yet.{" "}
            <Link
              href="/shop"
              className="text-cf-cta underline-offset-2 hover:underline focus-visible:outline-none"
            >
              Browse the shop
            </Link>{" "}
            to find something you love.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {registry.items.map((item) => (
            <li
              key={item._id}
              className="flex items-center gap-4 rounded-lg border border-cf-divider bg-white p-4"
            >
              {item.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt={item.productName}
                  className="h-16 w-16 shrink-0 rounded-md object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-cf-espresso">
                  {item.productName}
                </p>
                <p className="text-xs text-cf-charcoal/60">
                  Qty: {item.quantity}
                  {item.purchasedQuantity > 0
                    ? ` · ${item.purchasedQuantity} claimed`
                    : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
