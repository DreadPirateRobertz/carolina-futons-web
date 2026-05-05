"use client";

import { useActionState } from "react";
import type { SubmitPhotoState } from "@/app/community-gallery/actions";
import { submitCommunityPhoto } from "@/app/community-gallery/actions";

const INITIAL: SubmitPhotoState = { status: "idle" };

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-cf-espresso">
        {children}
        {required && <span className="ml-1 text-red-500" aria-hidden>*</span>}
      </span>
    </label>
  );
}

function TextInput({
  name,
  placeholder,
  required,
  maxLength,
  defaultValue,
}: {
  name: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  defaultValue?: string;
}) {
  return (
    <input
      type="text"
      name={name}
      required={required}
      maxLength={maxLength}
      placeholder={placeholder}
      defaultValue={defaultValue}
      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-cf-espresso placeholder:text-gray-400 focus:border-cf-espresso focus:outline-none focus:ring-1 focus:ring-cf-espresso"
    />
  );
}

export function PhotoSubmitForm({ defaultProductSlug }: { defaultProductSlug?: string } = {}) {
  const [state, action, isPending] = useActionState(submitCommunityPhoto, INITIAL);

  if (state.status === "success") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
        <p className="text-base font-medium text-green-800">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <div>
        <FieldLabel required>Photo URL</FieldLabel>
        <TextInput
          name="imageUrl"
          required
          placeholder="https://i.imgur.com/yourphoto.jpg"
          maxLength={2000}
        />
        <p className="mt-1 text-xs text-cf-espresso/60">
          Upload your photo to Imgur, Google Photos, or similar, then paste the direct link here.
        </p>
      </div>

      <div>
        <FieldLabel required>Your name</FieldLabel>
        <TextInput name="customerName" required placeholder="Jane S." maxLength={80} />
      </div>

      <div>
        <FieldLabel>City / state</FieldLabel>
        <TextInput name="location" placeholder="Asheville, NC" maxLength={100} />
      </div>

      <div>
        <FieldLabel>Caption</FieldLabel>
        <textarea
          name="caption"
          maxLength={400}
          placeholder="Our Asheville frame in the living room — love how it converts!"
          rows={3}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-cf-espresso placeholder:text-gray-400 focus:border-cf-espresso focus:outline-none focus:ring-1 focus:ring-cf-espresso"
        />
      </div>

      <div>
        <FieldLabel>Product (optional)</FieldLabel>
        <TextInput
          name="productSlug"
          placeholder="asheville-futon-frame"
          maxLength={100}
          defaultValue={defaultProductSlug}
        />
        <p className="mt-1 text-xs text-cf-espresso/60">
          The product slug from the URL, e.g. <code>asheville-futon-frame</code>.
          {defaultProductSlug ? " Pre-filled from the product page you came from." : ""}
        </p>
      </div>

      {state.status === "error" && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-cf-espresso px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-cf-espresso/90 disabled:opacity-50"
      >
        {isPending ? "Submitting…" : "Submit photo"}
      </button>

      <p className="text-xs text-cf-espresso/50 text-center">
        Photos are reviewed before appearing in the gallery. We never share your contact info.
      </p>
    </form>
  );
}
