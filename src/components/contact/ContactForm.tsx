"use client";

import { useId, useState } from "react";
import {
  coerceContactRequest,
  hasContactErrors,
  validateContactRequest,
  type ContactErrors,
  type ContactRequest,
} from "@/lib/contact/contact-schema";

type SubmitState =
  | { phase: "idle" }
  | { phase: "submitting" }
  | { phase: "success" }
  | { phase: "error"; message: string };

const EMPTY: ContactRequest = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
};

// Client-side contact form. Validates in-browser first (for instant feedback)
// and re-validates on the server (source of truth). Successful submit replaces
// the form with a plain thank-you panel so the user has a definitive terminal
// state — no ambiguous empty form after a successful POST.
export function ContactForm() {
  const [values, setValues] = useState<ContactRequest>(EMPTY);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [submit, setSubmit] = useState<SubmitState>({ phase: "idle" });

  const nameId = useId();
  const emailId = useId();
  const phoneId = useId();
  const subjectId = useId();
  const messageId = useId();

  const onChange =
    (field: keyof ContactRequest) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const next = { ...values, [field]: event.target.value };
      setValues(next);
      if (errors[field]) {
        const { [field]: _removed, ...rest } = errors;
        setErrors(rest);
      }
    };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const coerced = coerceContactRequest(values);
    const localErrors = validateContactRequest(coerced);
    if (hasContactErrors(localErrors)) {
      setErrors(localErrors);
      return;
    }

    setErrors({});
    setSubmit({ phase: "submitting" });

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(coerced),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        errors?: ContactErrors;
      };
      if (res.ok && body.ok) {
        setSubmit({ phase: "success" });
        setValues(EMPTY);
        return;
      }
      if (res.status === 400 && body.errors) {
        setErrors(body.errors);
        setSubmit({ phase: "idle" });
        return;
      }
      setSubmit({
        phase: "error",
        message: "We couldn't send that — please try again in a moment.",
      });
    } catch {
      setSubmit({
        phase: "error",
        message: "Network trouble — please check your connection and retry.",
      });
    }
  };

  if (submit.phase === "success") {
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

  const labelClass =
    "block text-sm font-medium tracking-tight text-cf-ink";
  const inputClass =
    "mt-2 block w-full rounded-md border border-cf-divider bg-white px-3 py-2 text-sm text-cf-ink shadow-sm focus:border-cf-cta focus:outline-none focus:ring-1 focus:ring-cf-cta";
  const errorClass = "mt-1 text-xs text-red-700";

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-5" aria-label="Contact form">
      <div>
        <label htmlFor={nameId} className={labelClass}>
          Name
        </label>
        <input
          id={nameId}
          name="name"
          type="text"
          autoComplete="name"
          value={values.name}
          onChange={onChange("name")}
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
          value={values.email}
          onChange={onChange("email")}
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
          value={values.phone ?? ""}
          onChange={onChange("phone")}
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
          value={values.subject}
          onChange={onChange("subject")}
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
          value={values.message}
          onChange={onChange("message")}
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

      {submit.phase === "error" ? (
        <p role="alert" className="text-sm text-red-700">
          {submit.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submit.phase === "submitting"}
        className="inline-flex h-11 items-center justify-center rounded-md bg-cf-cta px-6 text-sm font-medium text-white shadow-sm transition-colors hover:bg-cf-cta/90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {submit.phase === "submitting" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
