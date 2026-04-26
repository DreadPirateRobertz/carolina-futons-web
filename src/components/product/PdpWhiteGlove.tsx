"use client";

import { useId, useState } from "react";

import { isValidZip } from "@/lib/product/shipping-estimate";

// cf-w2my follow-up: white-glove delivery promo on PDP for orders ≥ $1,500.
// The bead's phase-1 scope ("gate purely on price") shipped under cf-3r9v;
// this slice wires the visibility to /api/delivery-zone so the message
// matches what the customer actually qualifies for at their ZIP rather
// than promising free white-glove to everyone above the threshold.
//
// State machine:
//   idle    → ZIP not entered. Render the prompt + ZIP form.
//   loading → fetch in flight.
//   ok      → API returned. Branch on `service`:
//               white-glove → green "free for your area" copy
//               ltl         → downgrade copy ("LTL freight to your ZIP")
//               unsupported → "outside our delivery area" copy
//   error   → network/parse failure. Generic retry copy.
//
// Below-threshold products render nothing — there's no white-glove story
// to tell a customer who isn't eligible yet, even hypothetically.

const WHITE_GLOVE_THRESHOLD_CENTS = 150_000; // $1,500

type DeliveryZoneOk = {
  ok: true;
  zip: string;
  zone: string;
  eligible: boolean;
  service: "white-glove" | "ltl" | "unsupported";
  estDays: { min: number; max: number };
  label: string;
};

type DeliveryZoneError = {
  ok: false;
  error: "missing-zip" | "invalid-zip" | "invalid-json";
};

type ZoneResult = DeliveryZoneOk | DeliveryZoneError;

type ZoneState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; data: DeliveryZoneOk }
  | { kind: "error"; message: string };

export type PdpWhiteGloveProps = {
  unitPriceCents: number;
  className?: string;
};

export function PdpWhiteGlove({
  unitPriceCents,
  className,
}: PdpWhiteGloveProps) {
  const [zip, setZip] = useState("");
  const [state, setState] = useState<ZoneState>({ kind: "idle" });
  const inputId = useId();

  if (
    !Number.isFinite(unitPriceCents) ||
    unitPriceCents < WHITE_GLOVE_THRESHOLD_CENTS
  ) {
    return null;
  }

  async function checkZone(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = zip.trim();
    if (!isValidZip(trimmed)) {
      setState({ kind: "error", message: "Please enter a 5-digit ZIP." });
      return;
    }
    setState({ kind: "loading" });
    try {
      const res = await fetch(
        `/api/delivery-zone?zip=${encodeURIComponent(trimmed)}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as ZoneResult;
      if (!data.ok) {
        setState({
          kind: "error",
          message:
            data.error === "invalid-zip"
              ? "That ZIP doesn't look right — please re-enter."
              : "We couldn't check that ZIP — please try again.",
        });
        return;
      }
      setState({ kind: "ok", data });
    } catch {
      setState({
        kind: "error",
        message: "We couldn't check that ZIP — please try again.",
      });
    }
  }

  return (
    <aside
      role="region"
      aria-label="Free white-glove delivery"
      data-slot="pdp-white-glove"
      className={
        "rounded-md border border-cf-cta/30 bg-cf-cream p-4 " +
        (className ?? "")
      }
    >
      <p className="text-sm font-medium text-cf-navy">
        Free white-glove delivery
      </p>
      {state.kind !== "ok" ? (
        <>
          <p className="mt-1 text-sm text-cf-charcoal/85">
            Orders over $1,500 ship with white-glove service in our delivery
            area. Enter your ZIP to confirm.
          </p>
          <form onSubmit={checkZone} className="mt-3 flex gap-2">
            <label htmlFor={inputId} className="sr-only">
              ZIP code
            </label>
            <input
              id={inputId}
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={5}
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="28801"
              className="w-32 rounded-md border border-cf-sand px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={state.kind === "loading"}
              className="rounded-md bg-cf-espresso px-4 py-2 text-sm font-medium text-white hover:bg-cf-espresso/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {state.kind === "loading" ? "Checking…" : "Check"}
            </button>
          </form>
          {state.kind === "error" ? (
            <p
              role="alert"
              className="mt-2 text-sm text-red-700"
            >
              {state.message}
            </p>
          ) : null}
        </>
      ) : (
        <ZoneOutcome data={state.data} />
      )}
    </aside>
  );
}

function ZoneOutcome({ data }: { data: DeliveryZoneOk }) {
  const window = `${data.estDays.min}-${data.estDays.max} business days`;
  if (data.service === "white-glove") {
    return (
      <p
        role="status"
        className="mt-1 text-sm font-medium text-cf-navy"
      >
        ✓ Free white-glove delivery to {data.zip} — typically {window}.
      </p>
    );
  }
  if (data.service === "ltl") {
    return (
      <p role="status" className="mt-1 text-sm text-cf-charcoal/85">
        White-glove isn&rsquo;t available at {data.zip}. This product ships
        LTL freight — typically {window}.
      </p>
    );
  }
  return (
    <p role="status" className="mt-1 text-sm text-cf-charcoal/85">
      We don&rsquo;t ship items this size to {data.zip}. Please contact us
      for special-arrangement options.
    </p>
  );
}
