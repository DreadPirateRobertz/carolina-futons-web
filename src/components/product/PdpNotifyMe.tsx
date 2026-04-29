"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { submitNotifyMe, type NotifyMeState } from "@/app/actions/notify-me";

type Props = {
  productId: string;
};

const INITIAL: NotifyMeState = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 rounded bg-cf-espresso px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cf-espresso/80 disabled:opacity-50"
    >
      {pending ? "Saving…" : "Notify me"}
    </button>
  );
}

export function PdpNotifyMe({ productId }: Props) {
  const [state, formAction] = useActionState<NotifyMeState, FormData>(
    submitNotifyMe,
    INITIAL,
  );

  if (state.status === "success") {
    return (
      <p
        role="status"
        data-testid="notify-me-success"
        className="text-sm text-cf-muted"
      >
        You&apos;ll be notified when this item is back in stock.
      </p>
    );
  }

  const hasError = state.status === "error";

  return (
    <form
      action={formAction}
      data-slot="pdp-notify-me"
      aria-label="Get back-in-stock notification"
      className="space-y-2"
      noValidate
    >
      <input type="hidden" name="productId" value={productId} />
      <p className="text-sm font-medium text-cf-espresso">
        Out of stock — enter your email to be notified when available.
      </p>
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="notify-email">
          Email address
        </label>
        <input
          id="notify-email"
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? "notify-me-error" : undefined}
          className="min-w-0 flex-1 rounded border border-cf-divider px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cf-cta/50"
        />
        <SubmitButton />
      </div>
      {hasError && (
        <p id="notify-me-error" role="alert" className="text-xs text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
