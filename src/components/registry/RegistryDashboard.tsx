"use client";

import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { ListPlus, Share2, Trash2, ExternalLink } from "lucide-react";
import { getMyRegistriesAction, deleteRegistryAction } from "@/app/actions/registry";
import { CreateRegistryForm } from "@/components/registry/CreateRegistryForm";
import type { RegistrySummary } from "@/lib/registry/registry-types";
import { OCCASION_LABELS } from "@/lib/registry/registry-types";

type Props = { initialRegistries: RegistrySummary[] };

const SITE_ORIGIN = "https://www.carolinafutons.com";

export function RegistryDashboard({ initialRegistries }: Props) {
  const [registries, setRegistries] = useState(initialRegistries);
  const [showCreate, setShowCreate] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      const res = await getMyRegistriesAction();
      if (res.success) setRegistries(res.registries);
    });
  }, []);

  function handleCreated(slug: string) {
    setShowCreate(false);
    refresh();
    void slug;
  }

  function handleDelete(registryId: string) {
    startTransition(async () => {
      await deleteRegistryAction(registryId);
      refresh();
    });
  }

  function copyShareLink(slug: string) {
    const url = `${SITE_ORIGIN}/registry/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2000);
    });
  }

  return (
    <div className="space-y-8">
      {/* Create button or form */}
      {showCreate ? (
        <div className="rounded-lg border border-cf-smoke p-5">
          <h2 className="mb-4 text-base font-semibold text-cf-espresso">
            New registry
          </h2>
          <CreateRegistryForm onCreated={handleCreated} />
          <button
            type="button"
            onClick={() => setShowCreate(false)}
            className="mt-3 text-xs text-cf-charcoal/50 underline-offset-2 hover:underline"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-md border border-cf-espresso px-4 py-2 text-sm font-medium text-cf-espresso transition hover:bg-cf-espresso hover:text-white"
        >
          <ListPlus className="h-4 w-4" />
          Create new registry
        </button>
      )}

      {/* Registry list */}
      {registries.length === 0 && !showCreate && (
        <p className="text-cf-charcoal/60">
          You don&apos;t have any registries yet. Create one to get started!
        </p>
      )}

      <ul className="space-y-4">
        {registries.map((reg) => (
          <li
            key={reg._id}
            className="rounded-lg border border-cf-smoke bg-white p-5 dark:bg-cf-espresso"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-heading text-lg font-semibold text-cf-espresso">
                  {reg.title}
                </h2>
                <p className="mt-0.5 text-sm text-cf-charcoal/60">
                  {OCCASION_LABELS[reg.occasion] ?? reg.occasion}
                  {reg.eventDate
                    ? ` · ${new Date(reg.eventDate).toLocaleDateString()}`
                    : ""}
                  {" · "}
                  {reg.itemCount} {reg.itemCount === 1 ? "item" : "items"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {reg.isPublic && (
                  <button
                    type="button"
                    onClick={() => copyShareLink(reg.slug)}
                    aria-label="Copy share link"
                    title={copiedSlug === reg.slug ? "Copied!" : "Copy share link"}
                    className="flex items-center gap-1.5 rounded-md border border-cf-smoke px-3 py-1.5 text-xs font-medium text-cf-charcoal transition hover:bg-cf-sand/40"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    {copiedSlug === reg.slug ? "Copied!" : "Share"}
                  </button>
                )}
                <Link
                  href={`/registry/${reg.slug}`}
                  target="_blank"
                  rel="noopener"
                  aria-label="View public registry"
                  title="View public registry"
                  className="flex items-center gap-1.5 rounded-md border border-cf-smoke px-3 py-1.5 text-xs font-medium text-cf-charcoal transition hover:bg-cf-sand/40"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(reg._id)}
                  disabled={isPending}
                  aria-label={`Delete ${reg.title}`}
                  className="flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>

            <div className="mt-3 text-xs text-cf-charcoal/50">
              Share link:{" "}
              <span className="font-mono">
                {SITE_ORIGIN}/registry/{reg.slug}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
