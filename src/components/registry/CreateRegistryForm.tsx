"use client";

import { useState, useTransition } from "react";
import { createRegistryAction } from "@/app/actions/registry";
import { OCCASION_LABELS, type RegistryOccasion } from "@/lib/registry/registry-types";

type Props = { onCreated: (slug: string) => void };

const OCCASIONS = Object.keys(OCCASION_LABELS) as RegistryOccasion[];

export function CreateRegistryForm({ onCreated }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const title = (fd.get("title") as string).trim();
    const occasion = fd.get("occasion") as RegistryOccasion;
    const eventDate = (fd.get("eventDate") as string) || undefined;
    const message = (fd.get("message") as string).trim() || undefined;
    const isPublic = fd.get("isPublic") === "on";

    if (!title) { setError("Title is required"); return; }

    startTransition(async () => {
      const result = await createRegistryAction({ title, occasion, eventDate, message, isPublic });
      if (!result.success) {
        setError(result.error);
        return;
      }
      onCreated(result.slug);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="reg-title" className="mb-1 block text-sm font-medium text-cf-charcoal">
          Registry name <span aria-hidden>*</span>
        </label>
        <input
          id="reg-title"
          name="title"
          type="text"
          required
          maxLength={100}
          placeholder="e.g. Sarah & Tom's Wedding Registry"
          className="w-full rounded-md border border-cf-smoke px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-cf-espresso"
        />
      </div>

      <div>
        <label htmlFor="reg-occasion" className="mb-1 block text-sm font-medium text-cf-charcoal">
          Occasion <span aria-hidden>*</span>
        </label>
        <select
          id="reg-occasion"
          name="occasion"
          defaultValue="other"
          className="w-full rounded-md border border-cf-smoke bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-cf-espresso"
        >
          {OCCASIONS.map((o) => (
            <option key={o} value={o}>{OCCASION_LABELS[o]}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="reg-eventDate" className="mb-1 block text-sm font-medium text-cf-charcoal">
          Event date{" "}
          <span className="font-normal text-cf-charcoal/70 text-xs">(optional)</span>
        </label>
        <input
          id="reg-eventDate"
          name="eventDate"
          type="date"
          className="w-full rounded-md border border-cf-smoke px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-cf-espresso"
        />
      </div>

      <div>
        <label htmlFor="reg-message" className="mb-1 block text-sm font-medium text-cf-charcoal">
          Message to guests{" "}
          <span className="font-normal text-cf-charcoal/70 text-xs">(optional)</span>
        </label>
        <textarea
          id="reg-message"
          name="message"
          rows={3}
          maxLength={500}
          placeholder="Thank you for being part of our special day…"
          className="w-full rounded-md border border-cf-smoke px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-cf-espresso"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-cf-charcoal">
        <input
          type="checkbox"
          name="isPublic"
          defaultChecked
          className="rounded border-cf-smoke"
        />
        Make registry publicly shareable
      </label>

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-cf-cta px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-cf-cta/90 disabled:opacity-60"
      >
        {isPending ? "Creating…" : "Create registry"}
      </button>
    </form>
  );
}
