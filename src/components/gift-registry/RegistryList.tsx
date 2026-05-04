"use client";

import Link from "next/link";
import { Gift, Trash2 } from "lucide-react";
import { OCCASION_LABELS, type RegistryDetail } from "@/lib/registry/registry-types";
import { RegistryShareButton } from "./RegistryShareButton";

type Props = {
  registries: RegistryDetail[];
  onDelete: (id: string) => void;
};

export function RegistryList({ registries, onDelete }: Props) {
  if (registries.length === 0) {
    return (
      <div
        data-slot="registry-list-empty"
        className="rounded-xl border border-dashed border-cf-divider px-6 py-10 text-center"
      >
        <Gift className="mx-auto size-8 text-cf-charcoal/30" aria-hidden="true" />
        <p className="mt-3 text-sm text-cf-charcoal/60">
          No registries yet. Create one to get started.
        </p>
      </div>
    );
  }

  return (
    <ul data-slot="registry-list" className="space-y-4">
      {registries.map((reg) => (
        <li
          key={reg._id}
          className="flex flex-col gap-3 rounded-xl border border-cf-divider bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <Link
              href={`/gift-registry/${reg._id}`}
              className="font-heading text-base font-semibold text-cf-espresso hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-navy"
            >
              {reg.title}
            </Link>
            <p className="mt-0.5 text-xs text-cf-charcoal/60">
              {OCCASION_LABELS[reg.occasion]}
              {reg.eventDate ? ` · ${reg.eventDate}` : ""}
              {!reg.isPublic ? " · Private" : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {reg.isPublic && <RegistryShareButton registryId={reg._id} />}
            <button
              type="button"
              onClick={() => onDelete(reg._id)}
              aria-label={`Delete ${reg.title}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-cf-charcoal/50 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-navy"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
