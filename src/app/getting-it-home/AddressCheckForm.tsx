"use client";

import { useActionState } from "react";

import { resolveDeliveryZone, type DeliveryZoneResult } from "./actions";

const INITIAL_STATE: DeliveryZoneResult | null = null;

// cf-3qt.4.4: client component for the address-check form on /getting-it-home.
// Uses useActionState so the page stays SSR-friendly and works without JS
// (form submits to the Server Action and the page re-renders with the result
// on the next request when JS is unavailable).
export function AddressCheckForm() {
  const [result, action, pending] = useActionState<
    DeliveryZoneResult | null,
    FormData
  >(async (_prev, formData) => resolveDeliveryZone(formData), INITIAL_STATE);

  return (
    <div className="space-y-6" data-slot="getting-it-home-form">
      <form
        action={action}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label
            htmlFor="gih-zip"
            className="block text-sm font-medium text-cf-espresso"
          >
            ZIP code
          </label>
          <input
            id="gih-zip"
            name="zip"
            type="text"
            inputMode="numeric"
            pattern="\d{5}"
            maxLength={5}
            required
            autoComplete="postal-code"
            placeholder="28792"
            className="mt-1 w-full rounded-md border border-cf-divider bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta dark:border-cf-sand dark:bg-cf-cream dark:text-cf-espresso"
          />
        </div>
        <div className="w-28">
          <label
            htmlFor="gih-state"
            className="block text-sm font-medium text-cf-espresso"
          >
            State (optional)
          </label>
          <input
            id="gih-state"
            name="state"
            type="text"
            maxLength={2}
            autoComplete="address-level1"
            placeholder="NC"
            className="mt-1 w-full rounded-md border border-cf-divider bg-white px-3 py-2 text-base uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta dark:border-cf-sand dark:bg-cf-cream dark:text-cf-espresso"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center justify-center rounded-md bg-cf-cta px-4 text-sm font-medium text-white transition-colors hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {pending ? "Checking…" : "Check my address"}
        </button>
      </form>

      {result ? <Result result={result} /> : null}
    </div>
  );
}

function Result({ result }: { result: DeliveryZoneResult }) {
  if (!result.ok) {
    if (result.reason === "invalid-zip") {
      return (
        <div
          role="status"
          data-slot="gih-result-invalid"
          className="rounded-md border border-cf-error/30 bg-cf-error/10 p-4 text-sm text-cf-espresso dark:bg-cf-error/20"
        >
          Please enter a valid 5-digit US ZIP code.
        </div>
      );
    }
    return (
      <div
        role="status"
        data-slot="gih-result-out-of-area"
        className="rounded-md border border-cf-divider bg-cf-cream p-4 text-sm text-cf-espresso dark:border-cf-sand dark:bg-cf-sand"
      >
        ZIP <strong>{result.zip}</strong> is outside our in-house delivery
        network. We can still ship via UPS/FedEx — see the{" "}
        <a className="underline hover:text-cf-cta" href="/shipping">
          Shipping page
        </a>{" "}
        for nationwide options.
      </div>
    );
  }

  const { zone } = result;
  return (
    <div
      role="status"
      data-slot="gih-result-zone"
      data-zone={zone.code}
      className="rounded-md border border-cf-cta/40 bg-cf-cream p-4 text-sm text-cf-espresso dark:bg-cf-sand"
    >
      <p className="font-medium">
        You&rsquo;re in <span className="text-cf-cta">{zone.name}</span>.
      </p>
      <p className="mt-1 text-cf-espresso/80">{zone.description}</p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
        <Stat label="Curbside delivery" value={`$${zone.delivery}`} />
        <Stat label="White-glove" value={`$${zone.whiteGlove}`} />
        <Stat label="Lead time" value={`${zone.deliveryDays} business days`} />
      </dl>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-cf-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
