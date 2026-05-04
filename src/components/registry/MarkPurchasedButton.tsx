"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { markItemPurchasedAction } from "@/app/actions/registry";

type Props = {
  itemId: string;
  remaining: number;
};

export function MarkPurchasedButton({ itemId, remaining }: Props) {
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");

  if (remaining <= 0 || done) {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-green-700">
        <Check className="h-3.5 w-3.5" />
        {done ? "Thank you!" : "Fully purchased"}
      </span>
    );
  }

  function handleMark() {
    setError(null);
    startTransition(async () => {
      const result = await markItemPurchasedAction(itemId, name || "Anonymous", 1);
      if (!result.success) {
        setError(result.error ?? "Something went wrong");
        return;
      }
      setDone(true);
      setShowForm(false);
    });
  }

  if (showForm) {
    return (
      <div className="mt-2 space-y-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name (optional)"
          maxLength={50}
          className="w-full rounded border border-cf-smoke px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-cf-espresso"
        />
        {error && (
          <p role="alert" className="text-xs text-red-600">{error}</p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleMark}
            disabled={isPending}
            className="rounded bg-cf-espresso px-3 py-1 text-xs font-medium text-white disabled:opacity-60"
          >
            {isPending ? "Saving…" : "I'm buying this"}
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="text-xs text-cf-charcoal/50 underline-offset-2 hover:underline"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setShowForm(true)}
      className="mt-2 text-xs text-cf-espresso underline-offset-2 hover:underline"
    >
      I&apos;m buying this
    </button>
  );
}
