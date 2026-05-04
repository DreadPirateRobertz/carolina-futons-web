"use client";

import { useState } from "react";
import { OCCASION_LABELS, type RegistryOccasion, type RegistryDetail } from "@/lib/registry/registry-types";
import { createRegistry } from "@/lib/registry/registry-storage";

type Props = {
  onCreated: (registry: RegistryDetail) => void;
};

const OCCASIONS = Object.entries(OCCASION_LABELS) as [RegistryOccasion, string][];

export function RegistryCreateForm({ onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [occasion, setOccasion] = useState<RegistryOccasion>("wedding");
  const [eventDate, setEventDate] = useState("");
  const [message, setMessage] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Registry name is required.");
      return;
    }
    setError("");
    const created = createRegistry(
      typeof window !== "undefined" ? window.localStorage : null,
      {
        title: trimmed,
        occasion,
        eventDate: eventDate || null,
        message: message.trim() || undefined,
        isPublic,
      },
    );
    setTitle("");
    setEventDate("");
    setMessage("");
    onCreated(created);
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Create a gift registry"
      className="space-y-5 rounded-xl border border-cf-divider bg-white p-6 shadow-sm"
    >
      <h2 className="font-heading text-xl font-semibold text-cf-espresso">
        Create a Registry
      </h2>

      <div>
        <label
          htmlFor="registry-title"
          className="block text-sm font-medium text-cf-charcoal"
        >
          Registry name <span aria-hidden="true">*</span>
        </label>
        <input
          id="registry-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Sarah & Tom's Wedding"
          required
          aria-required="true"
          aria-describedby={error ? "registry-title-error" : undefined}
          className="mt-1.5 w-full rounded-md border border-cf-divider px-3 py-2 text-sm text-cf-espresso placeholder-cf-charcoal/40 focus:border-cf-navy focus:outline-none focus:ring-1 focus:ring-cf-navy"
        />
        {error && (
          <p
            id="registry-title-error"
            role="alert"
            className="mt-1 text-xs text-red-600"
          >
            {error}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="registry-occasion"
          className="block text-sm font-medium text-cf-charcoal"
        >
          Occasion
        </label>
        <select
          id="registry-occasion"
          value={occasion}
          onChange={(e) => setOccasion(e.target.value as RegistryOccasion)}
          className="mt-1.5 w-full rounded-md border border-cf-divider bg-white px-3 py-2 text-sm text-cf-espresso focus:border-cf-navy focus:outline-none focus:ring-1 focus:ring-cf-navy"
        >
          {OCCASIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="registry-date"
          className="block text-sm font-medium text-cf-charcoal"
        >
          Event date <span className="text-cf-charcoal/50">(optional)</span>
        </label>
        <input
          id="registry-date"
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          className="mt-1.5 w-full rounded-md border border-cf-divider px-3 py-2 text-sm text-cf-espresso focus:border-cf-navy focus:outline-none focus:ring-1 focus:ring-cf-navy"
        />
      </div>

      <div>
        <label
          htmlFor="registry-message"
          className="block text-sm font-medium text-cf-charcoal"
        >
          Note for guests <span className="text-cf-charcoal/50">(optional)</span>
        </label>
        <textarea
          id="registry-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="A short message guests will see when visiting your registry."
          className="mt-1.5 w-full resize-none rounded-md border border-cf-divider px-3 py-2 text-sm text-cf-espresso placeholder-cf-charcoal/40 focus:border-cf-navy focus:outline-none focus:ring-1 focus:ring-cf-navy"
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          id="registry-public"
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="h-4 w-4 rounded border-cf-divider text-cf-navy focus:ring-cf-navy"
        />
        <label
          htmlFor="registry-public"
          className="text-sm text-cf-charcoal"
        >
          Make this registry shareable via link
        </label>
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-cf-cta px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-navy"
      >
        Create registry
      </button>
    </form>
  );
}
