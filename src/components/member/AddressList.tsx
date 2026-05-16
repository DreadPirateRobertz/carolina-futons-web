"use client";

/**
 * cf-dmos (cf-zn5b.2 G-9): saved-address list with per-row Edit/Delete.
 * Edit mode toggles an inline AddressForm seeded with that address.
 * Delete is one click — no confirm modal in V1; per cf-3qt.6 V1 scope.
 */

import { useState, useTransition } from "react";

import { type Address, deleteAddress } from "@/app/actions/addresses";
import { AddressForm } from "@/components/member/AddressForm";

export type AddressListProps = {
  initial: readonly Address[];
};

export function AddressList({ initial }: AddressListProps) {
  const [items, setItems] = useState<readonly Address[]>(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(items.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function refresh() {
    // Server action revalidates /dashboard/addresses; the page-level
    // server component refetch will update `initial` on next render.
    // For the current mount we close the editor — Next.js renders the
    // fresh server state in the same transition.
    setEditingId(null);
    setAdding(false);
  }

  function handleDelete(id: string) {
    setError(null);
    const previous = items;
    setItems(items.filter((a) => a._id !== id));
    startTransition(async () => {
      const result = await deleteAddress(id);
      if (!result.ok) {
        setItems(previous);
        setError(result.error);
      }
    });
  }

  return (
    <div data-testid="address-list" className="space-y-4">
      {error ? (
        <p role="alert" className="text-sm text-red-600" data-testid="address-list-error">
          {error}
        </p>
      ) : null}

      {items.length === 0 && !adding ? (
        <div
          data-testid="address-list-empty"
          className="rounded-lg border border-cf-divider bg-white p-8 text-center dark:bg-cf-cream"
        >
          <p className="text-sm text-cf-muted">
            No saved addresses yet. Add one so checkout pre-fills next time.
          </p>
        </div>
      ) : null}

      <ul className="space-y-3" aria-label="Saved addresses">
        {items.map((a) =>
          editingId === a._id ? (
            <li key={a._id ?? a.addressLine} data-testid="address-row-editing">
              <AddressForm address={a} onDone={refresh} />
            </li>
          ) : (
            <li
              key={a._id ?? a.addressLine}
              data-testid="address-row"
              className="flex items-start justify-between gap-4 rounded-lg border border-cf-divider bg-white p-4 dark:bg-cf-cream"
            >
              <div className="text-sm text-cf-ink">
                <p>{a.addressLine}</p>
                {a.addressLine2 ? <p>{a.addressLine2}</p> : null}
                <p>
                  {a.city}, {a.subdivision} {a.postalCode}
                </p>
                <p className="text-cf-muted">{a.country}</p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => a._id && setEditingId(a._id)}
                  disabled={pending}
                  data-testid="address-row-edit"
                  className="rounded-sm text-cf-cta underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => a._id && handleDelete(a._id)}
                  disabled={pending}
                  data-testid="address-row-delete"
                  className="rounded-sm text-red-600 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ),
        )}
      </ul>

      {adding ? (
        <AddressForm onDone={refresh} />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          data-testid="address-list-add-trigger"
          className="rounded-md border border-cf-cta px-4 py-2 text-sm font-semibold text-cf-cta hover:bg-cf-cta hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2"
        >
          Add a new address
        </button>
      )}
    </div>
  );
}
