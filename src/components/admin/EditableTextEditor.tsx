"use client";

import { useEffect, useRef, useState, useTransition } from "react";

// cfw-v5w (cfw-6qd.2): inline editor for SiteContent strings, rendered
// only for owners by EditableText (server). Two visual states:
//
//   1. Closed  — a hover-revealed pencil button next to the rendered text.
//                opacity 0 by default, opacity 100 on parent group hover or
//                when the button itself receives focus, so the affordance is
//                discoverable but never crowds the page.
//   2. Open    — an inline form: textarea + Save/Cancel. Submits POST to
//                /api/admin/site-content (sub-bead 3, cfw-6qd.3).
//
// Errors from the POST are surfaced inline so a 404 (the path until #3
// lands) renders a visible error rather than a silent failure. On a
// successful save we reload the page so SSR re-fetches the now-revalidated
// SiteContent value (cfw-r5x's webhook on Wix Data triggers
// revalidateTag("site-content") for the cache layer cfw-vxb wired up).

export type EditableTextEditorProps = {
  contentKey: string;
  initialValue: string;
};

export function EditableTextEditor({
  contentKey,
  initialValue,
}: EditableTextEditorProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus the textarea on open so editing is one-keystroke away. Effect
  // (not autofocus prop) so it re-fires if the user toggles open/closed.
  useEffect(() => {
    if (!open) return;
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [open]);

  function cancel() {
    setOpen(false);
    setValue(initialValue);
    setError(null);
  }

  function save() {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Value cannot be empty.");
      return;
    }
    startTransition(async () => {
      setError(null);
      let res: Response;
      try {
        res = await fetch("/api/admin/site-content", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ key: contentKey, value: trimmed }),
        });
      } catch {
        setError("Network error — try again.");
        return;
      }
      if (!res.ok) {
        setError(`Save failed (${res.status})`);
        return;
      }
      // Reload so SSR pulls the freshly-revalidated value. Reload is the
      // simplest correctness guarantee until sub-bead 4 wires per-key
      // optimistic UI (we don't optimistically update the rendered text
      // because Brenda may have multiple <EditableText> instances of the
      // same key on one page and the source of truth is the server).
      window.location.reload();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        aria-label={`Edit ${contentKey}`}
        data-testid="editable-text-pencil"
        onClick={() => setOpen(true)}
        className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded text-cf-cta opacity-0 transition-opacity hover:bg-cf-cream/40 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta"
      >
        <PencilIcon />
      </button>
    );
  }

  return (
    <span
      role="dialog"
      aria-label={`Edit ${contentKey}`}
      data-testid="editable-text-editor"
      data-key={contentKey}
      className="absolute left-0 top-full z-50 mt-1 flex min-w-[280px] flex-col gap-2 rounded-md border border-cf-divider bg-white p-3 shadow-lg"
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={pending}
        rows={3}
        aria-label={`Value for ${contentKey}`}
        className="min-h-[3rem] resize-y rounded border border-cf-divider px-2 py-1 text-sm text-cf-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta"
      />
      {error ? (
        <p role="alert" className="text-xs text-red-600" data-testid="editable-text-error">
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={cancel}
          disabled={pending}
          className="inline-flex h-8 items-center justify-center rounded-md border border-cf-divider px-3 text-xs font-medium text-cf-ink hover:bg-cf-cream/40 disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="inline-flex h-8 items-center justify-center rounded-md bg-cf-cta px-3 text-xs font-medium text-white hover:bg-cf-cta/90 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </span>
  );
}

function PencilIcon() {
  // Inline SVG keeps the editor zero-dependency and avoids pulling
  // lucide-react into the SiteContent code path purely for one icon.
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
