"use client";

import { useActionState, useId } from "react";
import { useFormStatus } from "react-dom";

import { sendContactForm } from "@/app/contact/actions";
import {
  initialContactActionState,
  type ContactActionState,
} from "@/app/contact/contact-state";
import type { ContactErrors, ContactRequest } from "@/lib/contact/contact-schema";

// cf-contact-form: thin client wrapper around the `sendContactForm` Server
// Action. Validation lives server-side (shared schema is the source of
// truth); on error we echo values + per-field errors back through
// useActionState so the user never loses what they typed.

const EMPTY_VALUES: ContactRequest = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
};

function errorsFrom(state: ContactActionState): ContactErrors {
  return state.status === "error" ? state.errors : {};
}

function valuesFrom(state: ContactActionState): ContactRequest {
  return state.status === "error" ? state.values : EMPTY_VALUES;
}

function transportErrorFrom(state: ContactActionState): string | null {
  return state.status === "error" && state.transportError
    ? state.transportError
    : null;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center rounded-md bg-cf-cta px-6 text-sm font-medium text-white shadow-sm transition-colors hover:bg-cf-cta/90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {pending ? "Sending…" : "Send message"}
    </button>
  );
}

export function ContactForm() {
  const [state, formAction] = useActionState(
    sendContactForm,
    initialContactActionState,
  );

  const nameId = useId();
  const emailId = useId();
  const phoneId = useId();
  const subjectId = useId();
  const messageId = useId();

  if (state.status === "success") {
    return (
      <div
        role="status"
        data-testid="contact-success"
        className="rounded-lg border border-cf-cta/30 bg-cf-sand/40 p-6 text-cf-ink"
      >
        <h2 className="font-playfair text-2xl font-semibold tracking-tight">
          Thanks — message received.
        </h2>
        <p className="mt-2 leading-relaxed">
          We read every note. Expect a reply within one business day (usually
          sooner).
        </p>
      </div>
    );
  }

  const errors = errorsFrom(state);
  const values = valuesFrom(state);
  const transportError = transportErrorFrom(state);

  const labelClass = "block text-sm font-medium tracking-tight text-cf-ink";
  const inputClass =
    "mt-2 block w-full rounded-md border border-cf-divider bg-white px-3 py-2 text-sm text-cf-ink shadow-sm focus:border-cf-cta focus:outline-none focus:ring-1 focus:ring-cf-cta";
  const errorClass = "mt-1 text-xs text-red-700";

  return (
    <form
      action={formAction}
      noValidate
      className="space-y-5"
      aria-label="Contact form"
    >
      <div>
        <label htmlFor={nameId} className={labelClass}>
          Name
        </label>
        <input
          id={nameId}
          name="name"
          type="text"
          autoComplete="name"
          defaultValue={values.name}
          className={inputClass}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? `${nameId}-error` : undefined}
          required
        />
        {errors.name ? (
          <p id={`${nameId}-error`} className={errorClass} role="alert">
            {errors.name}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor={emailId} className={labelClass}>
          Email
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={values.email}
          className={inputClass}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? `${emailId}-error` : undefined}
          required
        />
        {errors.email ? (
          <p id={`${emailId}-error`} className={errorClass} role="alert">
            {errors.email}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor={phoneId} className={labelClass}>
          Phone <span className="text-cf-muted">(optional)</span>
        </label>
        <input
          id={phoneId}
          name="phone"
          type="tel"
          autoComplete="tel"
          defaultValue={values.phone ?? ""}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor={subjectId} className={labelClass}>
          Subject
        </label>
        <input
          id={subjectId}
          name="subject"
          type="text"
          defaultValue={values.subject}
          className={inputClass}
          aria-invalid={errors.subject ? true : undefined}
          aria-describedby={errors.subject ? `${subjectId}-error` : undefined}
          required
        />
        {errors.subject ? (
          <p id={`${subjectId}-error`} className={errorClass} role="alert">
            {errors.subject}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor={messageId} className={labelClass}>
          Message
        </label>
        <textarea
          id={messageId}
          name="message"
          rows={6}
          defaultValue={values.message}
          className={inputClass}
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? `${messageId}-error` : undefined}
          required
        />
        {errors.message ? (
          <p id={`${messageId}-error`} className={errorClass} role="alert">
            {errors.message}
          </p>
        ) : null}
      </div>

      {transportError ? (
        <p role="alert" className="text-sm text-red-700">
          {transportError}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
