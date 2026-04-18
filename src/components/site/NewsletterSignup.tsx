"use client";

import { useActionState, useId } from "react";
import { useFormStatus } from "react-dom";

import {
  subscribeToNewsletter,
  initialNewsletterActionState,
  type NewsletterActionState,
} from "@/app/newsletter/actions";

// cf-newsletter-footer: slim footer signup. Uses a Server Action via
// useActionState so the form works without JS (progressive enhancement)
// and doesn't need a client fetch call. Success / duplicate / error are
// rendered inline — the row collapses into a single line of status copy
// on success to keep the footer visually quiet.

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-cf-cta px-5 text-sm font-medium text-white transition-colors hover:bg-cf-cta/90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-cf-footer-bg"
    >
      {pending ? "Subscribing…" : "Subscribe"}
    </button>
  );
}

export function NewsletterSignup() {
  const [state, formAction] = useActionState<
    NewsletterActionState,
    FormData
  >(subscribeToNewsletter, initialNewsletterActionState);
  const emailId = useId();
  const statusId = `${emailId}-status`;

  if (state.status === "success") {
    return (
      <div
        role="status"
        data-testid="newsletter-success"
        className="rounded-md border border-cf-cream/20 bg-cf-cream/5 px-4 py-3 text-sm text-cf-cream/90"
      >
        {state.alreadySubscribed
          ? "You're already on the list — thanks for being a part of it."
          : "Thanks — you're on the list. Look for our next note soon."}
      </div>
    );
  }

  const fieldError = state.status === "error" ? state.errors.email : undefined;
  const storeError =
    state.status === "error" ? state.storeError : undefined;

  return (
    <form
      action={formAction}
      noValidate
      aria-label="Newsletter signup"
      className="flex flex-col gap-2"
    >
      <div>
        <label htmlFor={emailId} className="font-heading text-cf-cream/70">
          Stay in the loop
        </label>
        <p className="mt-1 text-xs text-cf-cream/60">
          New arrivals, sales, and the occasional shop update. One email a month, no spam.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError || storeError ? statusId : undefined}
          required
          className="h-10 w-full min-w-0 flex-1 rounded-md border border-cf-cream/20 bg-cf-cream/5 px-3 text-sm text-cf-cream placeholder:text-cf-cream/40 focus:border-cf-cream/60 focus:outline-none focus:ring-1 focus:ring-cf-cream/40"
        />
        <SubmitButton />
      </div>
      {fieldError ? (
        <p id={statusId} role="alert" className="text-xs text-red-300">
          {fieldError}
        </p>
      ) : null}
      {storeError ? (
        <p id={statusId} role="alert" className="text-xs text-red-300">
          {storeError}
        </p>
      ) : null}
    </form>
  );
}
