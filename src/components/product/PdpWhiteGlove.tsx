"use client";

import { useEffect, useId, useRef, useState } from "react";

import { isValidZip } from "@/lib/product/shipping-estimate";
import type {
  DeliveryZoneOk,
  DeliveryZoneResponse,
} from "@/lib/shipping/delivery-zone-types";
import { logError } from "@/lib/log";

// cf-w2my follow-up: white-glove delivery promo on PDP for orders ≥ $1,500.
// The bead's phase-1 scope ("gate purely on price") shipped under cf-3r9v;
// this slice wires the visibility to /api/delivery-zone so the message
// matches what the customer actually qualifies for at their ZIP rather
// than promising free white-glove to everyone above the threshold.
//
// State machine (form stays mounted in every state so the user can
// re-check a different ZIP at any time):
//   idle    → ZIP not entered. Form alone.
//   loading → fetch in flight. Button disabled, label "Checking…".
//   ok      → API returned. Outcome strip renders below the form,
//             branched on `service`:
//               white-glove → "✓ Free white-glove delivery to {ZIP}"
//               ltl         → downgrade copy ("ships LTL freight")
//               unsupported → "items this size" + contact-us CTA
//   error   → Branched copy below the form:
//               client validation (`isValidZip` failed) → "5-digit ZIP"
//               API `invalid-zip`                       → "doesn't look right"
//               fetch reject / non-ok / parse failure   → "couldn't check"
//
// Below-threshold products render nothing — there's no white-glove story
// to tell a customer who isn't eligible yet, even hypothetically.
//
// Reliability: 8s AbortSignal.timeout caps every fetch; an AbortController
// per submit drops stale responses if the user resubmits before the prior
// fetch resolves; the same controller aborts on unmount. Uncaught fetch
// rejections are logged via console.error so Sentry's global handler
// captures them (matches src/components/account/AccountSignIn.tsx).

const WHITE_GLOVE_THRESHOLD_CENTS = 150_000; // $1,500
const FETCH_TIMEOUT_MS = 8_000;

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
  // Track the latest in-flight request so a stale response from an
  // earlier submit can't overwrite a newer one. Also lets us abort on
  // unmount.
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

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

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const timeoutSignal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
    const signal = AbortSignal.any([ac.signal, timeoutSignal]);

    setState({ kind: "loading" });
    try {
      const res = await fetch(
        `/api/delivery-zone?zip=${encodeURIComponent(trimmed)}`,
        { cache: "no-store", signal },
      );
      if (!res.ok && res.status !== 400) {
        // 400s carry our typed error envelope; anything else is an infra
        // failure that res.json() may or may not be able to parse.
        throw new Error(`delivery-zone HTTP ${res.status}`);
      }
      const data = (await res.json()) as DeliveryZoneResponse;
      // Drop stale responses from earlier submits.
      if (ac.signal.aborted) return;
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
    } catch (err) {
      // AbortError fires when the user resubmits or the component
      // unmounts mid-flight; that's not a failure to surface.
      if ((err as Error)?.name === "AbortError") return;
      await logError("pdp-white-glove", "delivery-zone-fetch", err);
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
        <p role="alert" className="mt-2 text-sm text-red-700">
          {state.message}
        </p>
      ) : null}
      {state.kind === "ok" ? <ZoneOutcome data={state.data} /> : null}
    </aside>
  );
}

function ZoneOutcome({ data }: { data: DeliveryZoneOk }) {
  const window = `${data.estDays.min}-${data.estDays.max} business days`;
  switch (data.service) {
    case "white-glove":
      return (
        <p
          role="status"
          className="mt-2 text-sm font-medium text-cf-navy"
        >
          ✓ Free white-glove delivery to {data.zip} — typically {window}.
        </p>
      );
    case "ltl":
      return (
        <p role="status" className="mt-2 text-sm text-cf-charcoal/85">
          White-glove isn&rsquo;t available at {data.zip}. This product
          ships LTL freight — typically {window}.
        </p>
      );
    case "unsupported":
      return (
        <p role="status" className="mt-2 text-sm text-cf-charcoal/85">
          We don&rsquo;t ship items this size to {data.zip}. Please
          contact us for special-arrangement options.
        </p>
      );
  }
}
