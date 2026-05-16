"use client";

// cfw-9to: /returns/start client form. POSTs to /api/returns/submit and
// renders success / error / pending states inline.
//
// WHY mirror WarrantyRegisterForm's explicit fetch + state machine over
// useActionState: the success state needs to render the server-returned
// RMA number prominently (it's the user's only handle on the return),
// and the error path distinguishes 400 (show server message) from 502
// (show generic try-again copy) — a state machine reads cleaner here
// than threading both through useActionState's prev-state slot.

import { useId, useState } from "react";

import { REASON_LABELS, VALID_REASONS } from "@/lib/returns/return-reasons";

const DETAILS_MAX = 2000;
const ORDER_NUMBER_MAX = 50;

export type StartReturnFormProps = {
  /** Optional pre-fill (e.g. from a /order-confirmation CTA). */
  initialOrderNumber?: string;
  /** Optional pre-fill for the email field. */
  initialEmail?: string;
};

type SuccessState = {
  kind: "success";
  rmaNumber: string;
  returnId: string;
  type: "return" | "exchange";
};
type ErrorState = { kind: "error"; message: string };
type IdleState = { kind: "idle" };
type PendingState = { kind: "pending" };
type FormState = IdleState | PendingState | SuccessState | ErrorState;

/**
 * Guest return-submission form.
 *
 * @param props.initialOrderNumber Optional pre-fill for the order
 *   number input (Thank-You-Page CTA pattern).
 * @param props.initialEmail Optional pre-fill for the email input.
 *
 * WHY guest-accessible (no auth gate): matches the Wix
 * `submitGuestReturn` webMethod's `Permissions.Anyone` — buyers in
 * particular often place orders without creating a member account, and
 * gating returns behind a sign-in would block legitimate refund
 * requests.
 */
export function StartReturnForm({
  initialOrderNumber = "",
  initialEmail = "",
}: StartReturnFormProps) {
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [email, setEmail] = useState(initialEmail);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [type, setType] = useState<"return" | "exchange">("return");
  const [state, setState] = useState<FormState>({ kind: "idle" });

  const orderNumberId = useId();
  const emailId = useId();
  const reasonId = useId();
  const detailsId = useId();
  const typeReturnId = useId();
  const typeExchangeId = useId();
  const alertId = useId();

  if (state.kind === "success") {
    return (
      <section
        role="status"
        data-testid="returns-submit-success"
        className="rounded-md border border-cf-divider bg-cf-cream p-6 text-cf-ink"
      >
        <h2 className="font-playfair text-2xl font-semibold tracking-tight">
          {state.type === "exchange"
            ? "Exchange request received"
            : "Return request received"}
        </h2>
        <p className="mt-2 leading-relaxed text-cf-charcoal/85">
          Save this number — you&apos;ll need it to track or reference your
          request. We&apos;ll email next steps to the address you provided.
        </p>
        <p className="mt-3 font-mono text-lg text-cf-ink">
          {state.rmaNumber}
        </p>
      </section>
    );
  }

  const errorMessage = state.kind === "error" ? state.message : null;
  const pending = state.kind === "pending";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedOrder = orderNumber.trim();
    const trimmedEmail = email.trim();
    if (!trimmedOrder) {
      setState({ kind: "error", message: "Order number is required." });
      return;
    }
    if (!trimmedEmail) {
      setState({ kind: "error", message: "Email is required." });
      return;
    }
    if (!reason) {
      setState({ kind: "error", message: "Please choose a reason for the return." });
      return;
    }
    setState({ kind: "pending" });
    try {
      const res = await fetch("/api/returns/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orderNumber: trimmedOrder,
          email: trimmedEmail,
          reason,
          details: details.trim() || undefined,
          type,
        }),
      });
      let parsed: unknown = null;
      try {
        parsed = await res.json();
      } catch {
        parsed = null;
      }
      if (
        res.ok &&
        parsed &&
        typeof parsed === "object" &&
        (parsed as { ok?: unknown }).ok === true &&
        typeof (parsed as { rmaNumber?: unknown }).rmaNumber === "string" &&
        typeof (parsed as { returnId?: unknown }).returnId === "string"
      ) {
        setState({
          kind: "success",
          rmaNumber: (parsed as { rmaNumber: string }).rmaNumber,
          returnId: (parsed as { returnId: string }).returnId,
          type,
        });
        return;
      }
      const message =
        parsed &&
        typeof parsed === "object" &&
        typeof (parsed as { error?: unknown }).error === "string"
          ? (parsed as { error: string }).error
          : "We couldn't save your request right now. Please try again shortly.";
      setState({ kind: "error", message });
    } catch {
      setState({
        kind: "error",
        message:
          "Network error. Please check your connection and try again shortly.",
      });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Start a return"
      noValidate
      className="mt-2 flex flex-col gap-5"
    >
      <div>
        <label
          htmlFor={orderNumberId}
          className="block text-sm font-medium text-cf-ink"
        >
          Order number
        </label>
        <input
          id={orderNumberId}
          name="orderNumber"
          type="text"
          required
          maxLength={ORDER_NUMBER_MAX}
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          aria-describedby={errorMessage ? alertId : undefined}
          className="mt-1.5 w-full rounded-md border border-cf-divider px-3 py-2 text-sm text-cf-ink focus:border-cf-navy focus:outline-none focus:ring-1 focus:ring-cf-navy"
        />
      </div>

      <div>
        <label
          htmlFor={emailId}
          className="block text-sm font-medium text-cf-ink"
        >
          Email used at checkout
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-describedby={errorMessage ? alertId : undefined}
          className="mt-1.5 w-full rounded-md border border-cf-divider px-3 py-2 text-sm text-cf-ink focus:border-cf-navy focus:outline-none focus:ring-1 focus:ring-cf-navy"
        />
      </div>

      <div>
        <label
          htmlFor={reasonId}
          className="block text-sm font-medium text-cf-ink"
        >
          Reason for the return
        </label>
        <select
          id={reasonId}
          name="reason"
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          aria-describedby={errorMessage ? alertId : undefined}
          className="mt-1.5 w-full rounded-md border border-cf-divider bg-white px-3 py-2 text-sm text-cf-ink focus:border-cf-navy focus:outline-none focus:ring-1 focus:ring-cf-navy"
        >
          <option value="">Pick a reason…</option>
          {VALID_REASONS.map((r) => (
            <option key={r} value={r}>
              {REASON_LABELS[r]}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="border-0 p-0">
        <legend className="text-sm font-medium text-cf-ink">
          Return or exchange?
        </legend>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-cf-ink">
          <label
            htmlFor={typeReturnId}
            className="inline-flex items-center gap-2"
          >
            <input
              id={typeReturnId}
              type="radio"
              name="type"
              value="return"
              checked={type === "return"}
              onChange={() => setType("return")}
              className="h-4 w-4 border-cf-divider text-cf-cta focus-visible:ring-cf-navy"
            />
            <span>Return</span>
          </label>
          <label
            htmlFor={typeExchangeId}
            className="inline-flex items-center gap-2"
          >
            <input
              id={typeExchangeId}
              type="radio"
              name="type"
              value="exchange"
              checked={type === "exchange"}
              onChange={() => setType("exchange")}
              className="h-4 w-4 border-cf-divider text-cf-cta focus-visible:ring-cf-navy"
            />
            <span>Exchange</span>
          </label>
        </div>
      </fieldset>

      <div>
        <label
          htmlFor={detailsId}
          className="block text-sm font-medium text-cf-ink"
        >
          Details <span className="text-cf-charcoal/60">(optional)</span>
        </label>
        <textarea
          id={detailsId}
          name="details"
          rows={4}
          maxLength={DETAILS_MAX}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="What's going on with the item? Photos can be emailed after we open the case."
          className="mt-1.5 w-full resize-none rounded-md border border-cf-divider px-3 py-2 text-sm text-cf-ink focus:border-cf-navy focus:outline-none focus:ring-1 focus:ring-cf-navy"
        />
      </div>

      {errorMessage ? (
        <p
          id={alertId}
          role="alert"
          className="text-sm text-red-600"
        >
          {errorMessage}
        </p>
      ) : null}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center justify-center rounded-md bg-cf-cta px-6 text-sm font-medium text-white transition-colors hover:bg-cf-cta/90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {pending ? "Submitting…" : "Start return"}
        </button>
      </div>
    </form>
  );
}
