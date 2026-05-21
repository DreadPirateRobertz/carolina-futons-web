"use client";

import { useActionState, useId } from "react";
import { useFormStatus } from "react-dom";

import { submitQuestion } from "@/app/products/[slug]/qa-actions";
import { initialQaState, type QaActionState } from "@/components/product/qa-state";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 items-center justify-center rounded-md bg-cf-cta px-5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-cf-cta/90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {pending ? "Submitting…" : "Submit question"}
    </button>
  );
}

function errorsFrom(state: QaActionState) {
  return state.status === "error" ? state.errors : {};
}

function valuesFrom(state: QaActionState) {
  return state.status === "error"
    ? state.values
    : { question: "", name: undefined };
}

export type CustomerQaFormProps = { productSlug: string };

export function CustomerQaForm({ productSlug }: CustomerQaFormProps) {
  const boundAction = submitQuestion.bind(null, productSlug);
  const [state, formAction] = useActionState(boundAction, initialQaState);

  const questionId = useId();
  const nameId = useId();

  if (state.status === "success") {
    return (
      <div
        role="status"
        data-testid="qa-success"
        className="rounded-lg border border-cf-cta/30 bg-cf-sand/40 p-5 text-cf-ink"
      >
        <p className="font-medium">Thanks — your question has been submitted.</p>
        <p className="mt-1 text-sm text-cf-muted">
          We&apos;ll post an answer here once the team responds.
        </p>
      </div>
    );
  }

  const errors = errorsFrom(state);
  const values = valuesFrom(state);
  const transportError =
    state.status === "error" ? state.transportError : undefined;

  const labelClass = "block text-sm font-medium tracking-tight text-cf-ink";
  const inputClass =
    "mt-2 block w-full rounded-md border border-cf-divider bg-white px-3 py-2 text-sm text-cf-ink shadow-sm focus:border-cf-cta focus:outline-none focus:ring-1 focus:ring-cf-cta";
  const errorClass = "mt-1 text-xs text-red-700";

  return (
    <form
      action={formAction}
      noValidate
      className="space-y-4"
      aria-label="Ask a question"
    >
      <div>
        <label htmlFor={questionId} className={labelClass}>
          Your question{" "}
          <span className="text-xs font-normal text-cf-muted">(max 500 characters)</span>
        </label>
        <textarea
          id={questionId}
          name="question"
          rows={4}
          maxLength={500}
          defaultValue={values.question}
          className={inputClass}
          aria-invalid={errors.question ? true : undefined}
          aria-describedby={errors.question ? `${questionId}-error` : undefined}
          required
        />
        {errors.question ? (
          <p id={`${questionId}-error`} className={errorClass} role="alert">
            {errors.question}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor={nameId} className={labelClass}>
          Name{" "}
          <span className="text-xs font-normal text-cf-muted">(optional — shown as initials only)</span>
        </label>
        <input
          id={nameId}
          name="name"
          type="text"
          autoComplete="name"
          defaultValue={values.name ?? ""}
          className={inputClass}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? `${nameId}-error` : undefined}
        />
        {errors.name ? (
          <p id={`${nameId}-error`} className={errorClass} role="alert">
            {errors.name}
          </p>
        ) : null}
      </div>

      {transportError ? (
        <p role="alert" className="text-sm text-red-700">
          {transportError}
        </p>
      ) : null}

      <SubmitBtn />
    </form>
  );
}
