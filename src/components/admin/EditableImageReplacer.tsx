"use client";

import { useRef, useState, useTransition } from "react";

// cfw-6qd.6: client subtree for the EditableImage replace flow.
//
// State machine (spec §5):
//
//   read → validate → uploading → saved (2s pulse) → read
//                  ↘ error (re-pickable) → validate
//
// `read` shows just the Replace button (hover/focus reveal). `validate`
// only flashes for client-side type/size mismatches before any network call.
// `uploading` disables the input while the POST is in flight. `saved`
// shows the success ping for ~2s then resets. `error` keeps the user able
// to re-pick a different file without reloading.

const UPLOAD_ENDPOINT = "/api/admin/image-upload";
const SAVED_PULSE_MS = 2000;

const ERROR_COPY: Record<number, string> = {
  401: "Your editing session expired. Please refresh the page and sign in again.",
  409: "Someone else replaced this image just now. Refresh to see their version.",
  413: "That file is too big — keep it under 5 MB.",
  415: "We can't open that file format. Try JPG, PNG, or WebP.",
  422: "That image is too small or this key isn't editable yet — ask Chris.",
  500: "Couldn't upload. Try again, or refresh the page if it keeps failing.",
};

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

type Status = "read" | "uploading" | "saved" | "error";

export type EditableImageReplacerProps = {
  contentKey: string;
  currentValue: string;
  alt: string;
  acceptHint?: string;
  maxBytes?: number;
};

export function EditableImageReplacer({
  contentKey,
  currentValue,
  alt,
  acceptHint = "image/jpeg, image/png, image/webp",
  maxBytes = 5_000_000,
}: EditableImageReplacerProps) {
  const [status, setStatus] = useState<Status>("read");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    setError(null);
    inputRef.current?.click();
  }

  function validate(file: File): string | null {
    if (!ALLOWED_MIME.has(file.type)) {
      return "We only accept JPG, PNG, or WebP. Try saving the file in one of those formats.";
    }
    if (file.size > maxBytes) {
      return "That file is too big — keep it under 5 MB. Try resizing it first.";
    }
    return null;
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset the input so picking the same file twice still triggers change.
    e.target.value = "";
    if (!file) return;

    const validationError = validate(file);
    if (validationError) {
      setStatus("error");
      setError(validationError);
      return;
    }

    startTransition(async () => {
      setStatus("uploading");
      setError(null);

      const form = new FormData();
      form.append("file", file);
      form.append("key", contentKey);
      form.append("ifMatch", currentValue);

      let res: Response;
      try {
        res = await fetch(UPLOAD_ENDPOINT, { method: "POST", body: form });
      } catch {
        setStatus("error");
        setError(ERROR_COPY[500] ?? "Network error.");
        return;
      }

      if (!res.ok) {
        setStatus("error");
        setError(ERROR_COPY[res.status] ?? `Upload failed (${res.status}).`);
        return;
      }

      setStatus("saved");
      // Defer reload so the saved-state pulse is visible before the page
      // re-renders. The reload pulls the new SiteContent value via
      // revalidateTag (cfw-vxb cache).
      setTimeout(() => window.location.reload(), SAVED_PULSE_MS);
    });
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={acceptHint}
        onChange={handleFile}
        data-testid="editable-image-input"
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />
      <button
        type="button"
        onClick={openPicker}
        disabled={pending || status === "uploading" || status === "saved"}
        aria-label={`Replace ${alt}`}
        data-testid="editable-image-replace"
        data-status={status}
        className="cf-editable-image__replace absolute right-2 top-2 z-10 inline-flex h-9 items-center justify-center gap-1 rounded-md bg-white/95 px-3 text-xs font-medium text-cf-ink opacity-0 shadow-md ring-1 ring-cf-divider transition-opacity hover:opacity-100 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta disabled:opacity-100"
      >
        <PencilIcon />
        {status === "uploading" ? "Uploading…" : status === "saved" ? "Saved" : "Replace"}
      </button>
      {error ? (
        <p
          role="alert"
          data-testid="editable-image-error"
          className="absolute left-2 right-2 top-full mt-2 rounded-md bg-white px-3 py-2 text-xs text-red-700 shadow-md ring-1 ring-red-200"
        >
          {error}
        </p>
      ) : null}
      {status === "uploading" ? (
        <span
          aria-live="polite"
          className="sr-only"
          data-testid="editable-image-uploading"
        >
          Uploading new image
        </span>
      ) : null}
      {status === "saved" ? (
        <span
          aria-live="polite"
          className="sr-only"
          data-testid="editable-image-saved"
        >
          Image uploaded
        </span>
      ) : null}
    </>
  );
}

function PencilIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}
