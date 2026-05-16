"use client";

// cfw-80n1: client form for /warranty/claim. POSTs to
// /api/warranty/claim and renders success / error / pending states
// inline. Mirrors cfw-1ud WarrantyRegisterForm shape (state machine,
// inline alerts, success panel) for consistency across the warranty
// flow.

import { useId, useState } from "react";

import {
  ISSUE_TYPE_LABELS,
  VALID_ISSUE_TYPES,
} from "@/lib/warranty/warranty-issue-types";

const DESCRIPTION_MIN = 10;
const DESCRIPTION_MAX = 2000;
const PHONE_MAX = 20;

export type WarrantyClaimFormProps = {
  /** Optional pre-fill from a /dashboard/warranties CTA or PdpWarrantyInfo. */
  initialWarrantyId?: string;
  /** Optional product name shown above the form for context. */
  initialProductName?: string;
};

type SuccessState = { kind: "success"; claimNumber: string; claimId: string };
type ErrorState = { kind: "error"; message: string };
type IdleState = { kind: "idle" };
type PendingState = { kind: "pending" };
type FormState = IdleState | PendingState | SuccessState | ErrorState;

/**
 * Member-facing warranty-claim form.
 *
 * @param props.initialWarrantyId Optional reference to a registered
 *   warranty (hidden field on the POST body).
 * @param props.initialProductName Optional product name to surface
 *   visibly above the form so the user knows the claim's context.
 *
 * WHY explicit local state machine over useActionState: parallel to
 * cfw-1ud WarrantyRegisterForm — the success state needs to render
 * the server-returned claimNumber prominently, and the 400 vs 502
 * error paths render distinct copy. Direct fetch + state machine is
 * the cleaner shape for this surface.
 */
export function WarrantyClaimForm({
  initialWarrantyId = "",
  initialProductName = "",
}: WarrantyClaimFormProps) {
  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [state, setState] = useState<FormState>({ kind: "idle" });

  const issueTypeId = useId();
  const descriptionId = useId();
  const emailId = useId();
  const phoneId = useId();
  const alertId = useId();

  if (state.kind === "success") {
    return (
      <section
        role="status"
        data-testid="warranty-claim-success"
        className="rounded-md border border-cf-divider bg-cf-cream p-6 text-cf-ink"
      >
        <h2 className="font-playfair text-2xl font-semibold tracking-tight">
          Claim submitted
        </h2>
        <p className="mt-2 leading-relaxed text-cf-charcoal/85">
          Save this number — we&apos;ll reference it in any follow-up.
          You&apos;ll hear from us within one business day.
        </p>
        <p className="mt-3 font-mono text-lg text-cf-ink">
          {state.claimNumber}
        </p>
      </section>
    );
  }

  const errorMessage = state.kind === "error" ? state.message : null;
  const pending = state.kind === "pending";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!issueType) {
      setState({
        kind: "error",
        message: "Please pick the issue type that best fits.",
      });
      return;
    }
    const trimmedDesc = description.trim();
    if (trimmedDesc.length < DESCRIPTION_MIN) {
      setState({
        kind: "error",
        message: `Description must be at least ${DESCRIPTION_MIN} characters.`,
      });
      return;
    }
    const trimmedEmail = contactEmail.trim();
    if (!trimmedEmail) {
      setState({ kind: "error", message: "Email is required." });
      return;
    }
    setState({ kind: "pending" });
    try {
      const res = await fetch("/api/warranty/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          issueType,
          description: trimmedDesc,
          contactEmail: trimmedEmail,
          contactPhone: contactPhone.trim() || undefined,
          warrantyId: initialWarrantyId.trim() || undefined,
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
        typeof (parsed as { claimNumber?: unknown }).claimNumber === "string" &&
        typeof (parsed as { claimId?: unknown }).claimId === "string"
      ) {
        setState({
          kind: "success",
          claimNumber: (parsed as { claimNumber: string }).claimNumber,
          claimId: (parsed as { claimId: string }).claimId,
        });
        return;
      }
      const message =
        parsed &&
        typeof parsed === "object" &&
        typeof (parsed as { error?: unknown }).error === "string"
          ? (parsed as { error: string }).error
          : "We couldn't save your claim right now. Please try again shortly.";
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
      aria-label="Warranty claim"
      noValidate
      className="mt-2 flex flex-col gap-5"
    >
      {initialProductName ? (
        <p className="rounded-md border border-cf-divider bg-cf-cream/40 px-3 py-2 text-sm text-cf-ink">
          Claim for:{" "}
          <span className="font-medium">{initialProductName}</span>
        </p>
      ) : null}

      <div>
        <label
          htmlFor={issueTypeId}
          className="block text-sm font-medium text-cf-ink"
        >
          Issue type
        </label>
        <select
          id={issueTypeId}
          name="issueType"
          required
          value={issueType}
          onChange={(e) => setIssueType(e.target.value)}
          aria-describedby={errorMessage ? alertId : undefined}
          className="mt-1.5 w-full rounded-md border border-cf-divider bg-white px-3 py-2 text-sm text-cf-ink focus:border-cf-navy focus:outline-none focus:ring-1 focus:ring-cf-navy"
        >
          <option value="">Pick one…</option>
          {VALID_ISSUE_TYPES.map((t) => (
            <option key={t} value={t}>
              {ISSUE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor={descriptionId}
          className="block text-sm font-medium text-cf-ink"
        >
          Describe what&apos;s happening
        </label>
        <textarea
          id={descriptionId}
          name="description"
          rows={5}
          required
          minLength={DESCRIPTION_MIN}
          maxLength={DESCRIPTION_MAX}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What happened, when, and any context that'll help us help you."
          aria-describedby={errorMessage ? alertId : undefined}
          className="mt-1.5 w-full resize-none rounded-md border border-cf-divider px-3 py-2 text-sm text-cf-ink focus:border-cf-navy focus:outline-none focus:ring-1 focus:ring-cf-navy"
        />
      </div>

      <div>
        <label
          htmlFor={emailId}
          className="block text-sm font-medium text-cf-ink"
        >
          Contact email
        </label>
        <input
          id={emailId}
          name="contactEmail"
          type="email"
          required
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          aria-describedby={errorMessage ? alertId : undefined}
          className="mt-1.5 w-full rounded-md border border-cf-divider px-3 py-2 text-sm text-cf-ink focus:border-cf-navy focus:outline-none focus:ring-1 focus:ring-cf-navy"
        />
      </div>

      <div>
        <label
          htmlFor={phoneId}
          className="block text-sm font-medium text-cf-ink"
        >
          Phone <span className="text-cf-charcoal/60">(optional)</span>
        </label>
        <input
          id={phoneId}
          name="contactPhone"
          type="tel"
          maxLength={PHONE_MAX}
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
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
          {pending ? "Filing claim…" : "File claim"}
        </button>
      </div>
    </form>
  );
}
