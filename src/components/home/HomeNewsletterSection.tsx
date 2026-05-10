"use client";

import { useActionState, useId } from "react";
import { useFormStatus } from "react-dom";

import { subscribeToNewsletter } from "@/app/newsletter/actions";
import {
  initialNewsletterActionState,
  type NewsletterActionState,
} from "@/app/newsletter/newsletter-state";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 shrink-0 items-center justify-center rounded-md bg-cf-navy px-6 text-sm font-semibold text-white transition-colors hover:bg-cf-navy/90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-navy focus-visible:ring-offset-2 dark:bg-cf-sand dark:text-cf-ink dark:hover:bg-cf-sand/90 dark:focus-visible:ring-cf-sand"
    >
      {pending ? "Subscribing…" : "Subscribe"}
    </button>
  );
}

function NewsletterForm() {
  const [state, formAction] = useActionState<NewsletterActionState, FormData>(
    subscribeToNewsletter,
    initialNewsletterActionState,
  );
  const emailId = useId();
  const statusId = `${emailId}-status`;

  if (state.status === "success") {
    return (
      <div
        role="status"
        data-testid="home-newsletter-success"
        className="rounded-md border border-cf-navy/20 bg-cf-navy/5 px-5 py-4 text-sm text-cf-navy dark:border-cf-sand/40 dark:bg-cf-sand/15 dark:text-cf-ink"
      >
        {state.alreadySubscribed
          ? "You're already on the list — thanks for being a part of it."
          : "Thanks — you're on the list. Look for our next note soon."}
      </div>
    );
  }

  const fieldError = state.status === "error" ? state.errors.email : undefined;
  const storeError = state.status === "error" ? state.storeError : undefined;

  return (
    <form
      action={formAction}
      noValidate
      aria-label="Newsletter signup"
      className="flex flex-col gap-2 sm:flex-row"
    >
      <label htmlFor={emailId} className="sr-only">
        Email address
      </label>
      <input
        id={emailId}
        name="email"
        type="email"
        autoComplete="email"
        placeholder="your@email.com"
        aria-invalid={fieldError ? true : undefined}
        aria-describedby={fieldError || storeError ? statusId : undefined}
        required
        className="h-11 w-full min-w-0 flex-1 rounded-md border border-cf-divider bg-white px-4 text-sm text-cf-espresso placeholder:text-cf-charcoal/40 focus:border-cf-navy focus:outline-none focus:ring-1 focus:ring-cf-navy dark:border-cf-sand dark:bg-cf-cream dark:text-cf-espresso dark:placeholder:text-cf-charcoal/60 dark:focus:border-cf-sand dark:focus:ring-cf-sand"
      />
      <SubmitButton />
      {fieldError ? (
        <p id={statusId} role="alert" className="text-xs text-red-600 sm:col-span-2">
          {fieldError}
        </p>
      ) : null}
      {storeError ? (
        <p id={statusId} role="alert" className="text-xs text-red-600 sm:col-span-2">
          {storeError}
        </p>
      ) : null}
    </form>
  );
}

export function HomeNewsletterSection() {
  return (
    <section
      data-slot="home-newsletter-section"
      aria-labelledby="home-newsletter-heading"
      className="border-t border-cf-divider bg-cf-sand/50"
    >
      <div className="mx-auto w-full max-w-2xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2
            id="home-newsletter-heading"
            className="font-heading text-2xl font-semibold text-cf-navy sm:text-3xl"
          >
            Stay in the loop
          </h2>
          <p className="mt-2 text-sm text-cf-charcoal/70">
            New arrivals, sales, and the occasional shop update.
            One email a month — no spam.
          </p>
        </div>
        <div className="mt-8">
          <NewsletterForm />
        </div>
      </div>
    </section>
  );
}
