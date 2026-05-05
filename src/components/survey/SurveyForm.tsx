"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";

import { submitSurvey } from "@/app/actions/survey";
import { initialSurveyActionState } from "@/app/survey/survey-state";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center rounded-md bg-cf-cta px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cf-cta-hover disabled:opacity-50"
    >
      {pending ? "Submitting…" : "Submit"}
    </button>
  );
}

const NPS_LABELS: Record<number, string> = {
  0: "Not at all",
  5: "Neutral",
  10: "Extremely likely",
};

export function SurveyForm({ orderId }: { orderId?: string }) {
  const [state, action] = useActionState(submitSurvey, initialSurveyActionState);
  const scoreRef = useRef<string | null>(null);

  if (state.status === "success") {
    return (
      <div
        data-testid="survey-success"
        className="rounded-lg border border-emerald-200 bg-emerald-50 px-6 py-8 text-center"
      >
        <p className="font-heading text-xl font-semibold text-emerald-800">
          Thank you for your feedback!
        </p>
        <p className="mt-2 text-sm text-emerald-700">
          Your response helps us keep improving.
        </p>
      </div>
    );
  }

  return (
    <form action={action} data-slot="survey-form" className="space-y-8">
      {orderId && (
        <input type="hidden" name="orderId" value={orderId} />
      )}

      <fieldset>
        <legend className="mb-4 text-base font-medium text-cf-ink">
          How likely are you to recommend Carolina Futons to a friend or family
          member?
        </legend>
        <div className="flex flex-wrap gap-2" role="group" aria-label="NPS score 0 to 10">
          {Array.from({ length: 11 }, (_, i) => (
            <label key={i} className="cursor-pointer">
              <input
                type="radio"
                name="score"
                value={String(i)}
                className="peer sr-only"
                required
                onChange={() => { scoreRef.current = String(i); }}
              />
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-cf-divider text-sm font-medium text-cf-ink transition-colors peer-checked:border-cf-cta peer-checked:bg-cf-cta peer-checked:text-white hover:border-cf-cta">
                {i}
              </span>
            </label>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-cf-charcoal/60">
          <span>{NPS_LABELS[0]}</span>
          <span>{NPS_LABELS[5]}</span>
          <span>{NPS_LABELS[10]}</span>
        </div>
      </fieldset>

      <div>
        <label
          htmlFor="survey-comments"
          className="mb-2 block text-base font-medium text-cf-ink"
        >
          What&apos;s the main reason for your score?{" "}
          <span className="text-cf-charcoal/50">(optional)</span>
        </label>
        <textarea
          id="survey-comments"
          name="comments"
          rows={4}
          maxLength={1000}
          placeholder="Tell us what we did well or could improve…"
          className="w-full rounded-md border border-cf-divider bg-white px-4 py-3 text-sm text-cf-ink placeholder:text-cf-charcoal/40 focus:border-cf-cta focus:outline-none focus:ring-1 focus:ring-cf-cta"
        />
      </div>

      {state.status === "error" && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
