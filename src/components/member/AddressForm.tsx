"use client";

/**
 * cf-dmos (cf-zn5b.2 G-9): controlled address form. Used for both
 * add (no `address` prop) and edit (`address` prop seeded). On submit
 * fires the appropriate server action; surfaces inline errors and
 * disables the form during the pending state.
 */

import { useState, useTransition } from "react";

import {
  type Address,
  type AddressInput,
  addAddress,
  updateAddress,
} from "@/app/actions/addresses";

export type AddressFormProps = {
  address?: Address; // present in edit mode; absent in add mode
  onDone?: () => void;
};

const EMPTY: AddressInput = {
  addressLine: "",
  addressLine2: "",
  city: "",
  subdivision: "",
  postalCode: "",
  country: "USA",
};

export function AddressForm({ address, onDone }: AddressFormProps) {
  const [form, setForm] = useState<AddressInput>(() =>
    address
      ? {
          addressLine: address.addressLine ?? "",
          addressLine2: address.addressLine2 ?? "",
          city: address.city ?? "",
          subdivision: address.subdivision ?? "",
          postalCode: address.postalCode ?? "",
          country: address.country ?? "USA",
        }
      : EMPTY,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const update = (field: keyof AddressInput, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = address?._id
        ? await updateAddress(address._id, form)
        : await addAddress(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDone?.();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="address-form"
      className="space-y-3 rounded-lg border border-cf-divider bg-white p-4 dark:bg-cf-cream"
    >
      <Field label="Street address" required>
        <input
          type="text"
          value={form.addressLine}
          onChange={(e) => update("addressLine", e.target.value)}
          disabled={pending}
          data-testid="address-form-line1"
          className="w-full rounded border border-cf-divider px-3 py-2"
        />
      </Field>
      <Field label="Apt / suite (optional)">
        <input
          type="text"
          value={form.addressLine2 ?? ""}
          onChange={(e) => update("addressLine2", e.target.value)}
          disabled={pending}
          className="w-full rounded border border-cf-divider px-3 py-2"
        />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="City" required>
          <input
            type="text"
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            disabled={pending}
            data-testid="address-form-city"
            className="w-full rounded border border-cf-divider px-3 py-2"
          />
        </Field>
        <Field label="State" required>
          <input
            type="text"
            value={form.subdivision}
            onChange={(e) => update("subdivision", e.target.value)}
            disabled={pending}
            data-testid="address-form-state"
            className="w-full rounded border border-cf-divider px-3 py-2"
          />
        </Field>
        <Field label="Zip" required>
          <input
            type="text"
            value={form.postalCode}
            onChange={(e) => update("postalCode", e.target.value)}
            disabled={pending}
            data-testid="address-form-zip"
            className="w-full rounded border border-cf-divider px-3 py-2"
          />
        </Field>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-600" data-testid="address-form-error">
          {error}
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          data-testid="address-form-submit"
          className="rounded-md bg-cf-cta px-4 py-2 text-sm font-semibold text-white hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {pending ? "Saving…" : address ? "Save changes" : "Add address"}
        </button>
        {onDone ? (
          <button
            type="button"
            onClick={onDone}
            disabled={pending}
            className="rounded-sm text-sm text-cf-muted underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-cf-ink">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      {children}
    </label>
  );
}
