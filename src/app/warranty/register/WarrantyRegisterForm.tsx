"use client";

// cfw-1ud: client form for /warranty/register. POSTs to
// /api/warranty/register and renders success / error / pending states
// inline.
//
// WHY a client form + fetch (vs. Server Action useActionState as used in
// NewsletterSignup / HomeNewsletterSection / EmailCapturePopup): the
// member-auth gate already happened in the server page above; the form
// itself benefits from explicit fetch handling because (a) we want the
// 502 wix_error path to render a distinct error string from the 400
// validation path, and (b) the success state needs to show the
// server-returned `registrationId` which the form needs to read out of
// the JSON response. A Server Action would force the discriminated
// result back through useActionState's prev-state slot, and the page
// would have to remount the form to clear the success state. Direct
// fetch is the simpler shape for this surface.

import { useId, useState } from "react";

const PRODUCT_NAME_MAX_LENGTH = 200;

export type WarrantyRegisterFormProps = {
  initialProductId?: string;
  initialProductName?: string;
  initialOrderId?: string;
};

type SuccessState = { kind: "success"; registrationId: string };
type ErrorState = { kind: "error"; message: string };
type IdleState = { kind: "idle" };
type PendingState = { kind: "pending" };
type FormState = IdleState | PendingState | SuccessState | ErrorState;

/**
 * Warranty-registration form (client). POSTs to /api/warranty/register
 * and renders success / error / pending states inline.
 *
 * @param props.initialProductId Optional product id pre-fill (passed
 *   through to the API as a hidden field).
 * @param props.initialProductName Optional product name pre-fill.
 * @param props.initialOrderId Optional order id pre-fill.
 *
 * WHY explicit local state machine instead of useActionState: see the
 * file-level comment.
 */
export function WarrantyRegisterForm({
  initialProductId = "",
  initialProductName = "",
  initialOrderId = "",
}: WarrantyRegisterFormProps) {
  const [productName, setProductName] = useState(initialProductName);
  const [orderId, setOrderId] = useState(initialOrderId);
  const [purchaseDate, setPurchaseDate] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [state, setState] = useState<FormState>({ kind: "idle" });

  const productNameId = useId();
  const orderIdId = useId();
  const purchaseDateId = useId();
  const serialNumberId = useId();
  const alertId = useId();

  if (state.kind === "success") {
    return (
      <section
        role="status"
        data-testid="warranty-register-success"
        className="rounded-md border border-cf-divider bg-cf-cream p-6 text-cf-ink"
      >
        <h2 className="font-playfair text-2xl font-semibold tracking-tight">
          Warranty registered
        </h2>
        <p className="mt-2 leading-relaxed text-cf-charcoal/85">
          Thanks — we have your registration on file. Hold onto this ID for
          your records:
        </p>
        <p className="mt-3 font-mono text-sm text-cf-ink">
          Registration ID: {state.registrationId}
        </p>
      </section>
    );
  }

  const errorMessage = state.kind === "error" ? state.message : null;
  const pending = state.kind === "pending";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedName = productName.trim();
    if (!trimmedName) {
      setState({ kind: "error", message: "Product name is required." });
      return;
    }
    if (trimmedName.length > PRODUCT_NAME_MAX_LENGTH) {
      setState({
        kind: "error",
        message: `Product name must be ${PRODUCT_NAME_MAX_LENGTH} characters or fewer.`,
      });
      return;
    }
    setState({ kind: "pending" });
    try {
      const res = await fetch("/api/warranty/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productId: initialProductId || "unknown",
          productName: trimmedName,
          orderId: orderId.trim() || null,
          purchaseDate: purchaseDate || null,
          serialNumber: serialNumber.trim() || null,
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
        typeof (parsed as { registrationId?: unknown }).registrationId === "string"
      ) {
        setState({
          kind: "success",
          registrationId: (parsed as { registrationId: string }).registrationId,
        });
        return;
      }
      const message =
        parsed &&
        typeof parsed === "object" &&
        typeof (parsed as { error?: unknown }).error === "string"
          ? (parsed as { error: string }).error
          : "We couldn't save your registration right now. Please try again shortly.";
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
      aria-label="Warranty registration"
      noValidate
      className="mt-2 flex flex-col gap-5"
    >
      <div>
        <label
          htmlFor={productNameId}
          className="block text-sm font-medium text-cf-ink"
        >
          Product name
        </label>
        <input
          id={productNameId}
          name="productName"
          type="text"
          required
          maxLength={PRODUCT_NAME_MAX_LENGTH}
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          aria-invalid={errorMessage ? true : undefined}
          aria-describedby={errorMessage ? alertId : undefined}
          className="mt-1.5 w-full rounded-md border border-cf-divider px-3 py-2 text-sm text-cf-ink focus:border-cf-navy focus:outline-none focus:ring-1 focus:ring-cf-navy"
        />
      </div>

      <div>
        <label
          htmlFor={orderIdId}
          className="block text-sm font-medium text-cf-ink"
        >
          Order number <span className="text-cf-charcoal/60">(optional)</span>
        </label>
        <input
          id={orderIdId}
          name="orderId"
          type="text"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          className="mt-1.5 w-full rounded-md border border-cf-divider px-3 py-2 text-sm text-cf-ink focus:border-cf-navy focus:outline-none focus:ring-1 focus:ring-cf-navy"
        />
      </div>

      <div>
        <label
          htmlFor={purchaseDateId}
          className="block text-sm font-medium text-cf-ink"
        >
          Purchase date{" "}
          <span className="text-cf-charcoal/60">(optional)</span>
        </label>
        <input
          id={purchaseDateId}
          name="purchaseDate"
          type="date"
          value={purchaseDate}
          onChange={(e) => setPurchaseDate(e.target.value)}
          className="mt-1.5 w-full rounded-md border border-cf-divider px-3 py-2 text-sm text-cf-ink focus:border-cf-navy focus:outline-none focus:ring-1 focus:ring-cf-navy"
        />
      </div>

      <div>
        <label
          htmlFor={serialNumberId}
          className="block text-sm font-medium text-cf-ink"
        >
          Serial number{" "}
          <span className="text-cf-charcoal/60">(optional)</span>
        </label>
        <input
          id={serialNumberId}
          name="serialNumber"
          type="text"
          value={serialNumber}
          onChange={(e) => setSerialNumber(e.target.value)}
          className="mt-1.5 w-full rounded-md border border-cf-divider px-3 py-2 text-sm text-cf-ink focus:border-cf-navy focus:outline-none focus:ring-1 focus:ring-cf-navy"
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
          {pending ? "Registering…" : "Register warranty"}
        </button>
      </div>
    </form>
  );
}
