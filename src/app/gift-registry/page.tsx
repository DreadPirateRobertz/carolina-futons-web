"use client";

// Gift Registry landing page (cf-l6aj.16).
// localStorage-backed v1 — no Wix CMS dependency.
// Shows the user's registries + create form.

import { useCallback, useEffect, useState } from "react";
import { Gift } from "lucide-react";
import { readRegistries, deleteRegistry } from "@/lib/registry/registry-storage";
import type { RegistryDetail } from "@/lib/registry/registry-types";
import { RegistryCreateForm } from "@/components/gift-registry/RegistryCreateForm";
import { RegistryList } from "@/components/gift-registry/RegistryList";

export default function GiftRegistryPage() {
  const [registries, setRegistries] = useState<RegistryDetail[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage unavailable during SSR
    setRegistries(readRegistries(window.localStorage));
  }, []);

  const handleCreated = useCallback((registry: RegistryDetail) => {
    setRegistries((prev) => [registry, ...prev]);
    setShowForm(false);
  }, []);

  const handleDelete = useCallback((id: string) => {
    deleteRegistry(window.localStorage, id);
    setRegistries((prev) => prev.filter((r) => r._id !== id));
  }, []);

  return (
    <main
      id="main"
      className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 sm:py-16"
    >
      <div className="mb-8 flex items-start gap-4">
        <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cf-espresso text-white">
          <Gift className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-cf-espresso">
            Gift Registries
          </h1>
          <p className="mt-2 text-cf-charcoal/70">
            Add furniture to a registry, share the link with family and friends,
            and track what&apos;s been claimed.
          </p>
        </div>
      </div>

      {showForm ? (
        <div className="mb-8">
          <RegistryCreateForm onCreated={handleCreated} />
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="mt-3 text-sm text-cf-charcoal/60 underline-offset-2 hover:underline focus-visible:outline-none"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="mb-8">
          <button
            type="button"
            data-slot="create-registry-trigger"
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-cf-espresso px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cf-espresso/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-navy"
          >
            + New registry
          </button>
        </div>
      )}

      <section aria-label="Your registries">
        <RegistryList registries={registries} onDelete={handleDelete} />
      </section>
    </main>
  );
}
