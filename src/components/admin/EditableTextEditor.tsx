"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { formatRelativeTime } from "@/lib/admin/format";

// cfw-v5w (cfw-6qd.2) + cfw-plg (cfw-6qd.10 follow-up): inline editor for
// SiteContent strings, rendered only for owners by EditableText (server).
//
// Three modes:
//   closed   — hover-revealed pencil + ↶ buttons.
//   editing  — textarea + Save/Cancel.
//   history  — versions list (prior values) + Cancel.
//                Click a version → POSTs the rollback through the same
//                /api/admin/site-content endpoint, which records audit +
//                writes a new history row marking "saved as the rollback
//                of <id>". Reload picks up the rolled-back value.
//
// Edits and rollbacks share the POST endpoint deliberately — both should
// produce identical audit/history trails so an `undo` is just another
// `save` with a previous value.

const SAVE_ENDPOINT = "/api/admin/site-content";
const HISTORY_ENDPOINT = "/api/admin/site-content/history";

type Mode = "closed" | "editing" | "history";

type HistoryRow = {
  _id?: string;
  _createdDate?: string;
  key: string;
  before: string;
  after: string;
  actorEmail?: string;
};

type HistoryState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; rows: HistoryRow[] }
  | { status: "error"; message: string };

export type EditableTextEditorProps = {
  contentKey: string;
  initialValue: string;
};

export function EditableTextEditor({
  contentKey,
  initialValue,
}: EditableTextEditorProps) {
  const [mode, setMode] = useState<Mode>("closed");
  const [value, setValue] = useState(initialValue);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryState>({ status: "idle" });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (mode !== "editing") return;
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [mode]);

  function closeAll() {
    setMode("closed");
    setValue(initialValue);
    setError(null);
  }

  function openHistory() {
    setMode("history");
    setError(null);
    setHistory({ status: "loading" });
    startTransition(async () => {
      let res: Response;
      try {
        res = await fetch(
          `${HISTORY_ENDPOINT}?key=${encodeURIComponent(contentKey)}`,
        );
      } catch {
        setHistory({ status: "error", message: "Network error — try again." });
        return;
      }
      if (!res.ok) {
        setHistory({
          status: "error",
          message: `Couldn't load history (${res.status})`,
        });
        return;
      }
      const data = (await res.json().catch(() => null)) as
        | { rows?: HistoryRow[] }
        | null;
      const rows = Array.isArray(data?.rows) ? data.rows : [];
      setHistory({ status: "loaded", rows });
    });
  }

  function save(nextValue: string) {
    const trimmed = nextValue.trim();
    if (!trimmed) {
      setError("Value cannot be empty.");
      return;
    }
    startTransition(async () => {
      setError(null);
      let res: Response;
      try {
        res = await fetch(SAVE_ENDPOINT, {
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
      window.location.reload();
    });
  }

  if (mode === "closed") {
    return (
      <>
        <button
          type="button"
          aria-label={`Edit ${contentKey}`}
          data-testid="editable-text-pencil"
          onClick={() => {
            setMode("editing");
            setError(null);
          }}
          className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded text-cf-cta opacity-0 transition-opacity hover:bg-cf-cream/40 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta"
        >
          <PencilIcon />
        </button>
        <button
          type="button"
          aria-label={`Show edit history for ${contentKey}`}
          data-testid="editable-text-undo"
          onClick={openHistory}
          className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded text-cf-cta opacity-0 transition-opacity hover:bg-cf-cream/40 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta"
        >
          <UndoIcon />
        </button>
      </>
    );
  }

  if (mode === "editing") {
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
          <p
            role="alert"
            className="text-xs text-red-600"
            data-testid="editable-text-error"
          >
            {error}
          </p>
        ) : null}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={closeAll}
            disabled={pending}
            className="inline-flex h-8 items-center justify-center rounded-md border border-cf-divider px-3 text-xs font-medium text-cf-ink hover:bg-cf-cream/40 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => save(value)}
            disabled={pending}
            className="inline-flex h-8 items-center justify-center rounded-md bg-cf-cta px-3 text-xs font-medium text-white hover:bg-cf-cta/90 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </span>
    );
  }

  // mode === "history"
  return (
    <span
      role="dialog"
      aria-label={`Edit history for ${contentKey}`}
      data-testid="editable-text-history-panel"
      data-key={contentKey}
      className="absolute left-0 top-full z-50 mt-1 flex min-w-[320px] flex-col gap-2 rounded-md border border-cf-divider bg-white p-3 shadow-lg"
    >
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-cf-muted">
        Edit history
      </p>
      {history.status === "loading" ? (
        <p
          className="text-sm text-cf-muted"
          data-testid="editable-text-history-loading"
        >
          Loading…
        </p>
      ) : null}
      {history.status === "error" ? (
        <p
          role="alert"
          className="text-xs text-red-600"
          data-testid="editable-text-history-error"
        >
          {history.message}
        </p>
      ) : null}
      {history.status === "loaded" && history.rows.length === 0 ? (
        <p
          className="text-sm text-cf-muted"
          data-testid="editable-text-history-empty"
        >
          No prior versions yet.
        </p>
      ) : null}
      {history.status === "loaded" && history.rows.length > 0 ? (
        <ul
          className="flex max-h-[240px] flex-col gap-1 overflow-y-auto"
          data-testid="editable-text-history-list"
        >
          {history.rows.map((row, i) => (
            <li key={row._id ?? `row-${i}`}>
              <button
                type="button"
                onClick={() => save(row.before)}
                disabled={pending}
                data-testid="editable-text-history-row"
                data-row-index={i}
                className="flex w-full flex-col items-start gap-0.5 rounded border border-cf-divider px-2 py-1 text-left text-xs text-cf-ink hover:border-cf-cta hover:bg-cf-cream/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta disabled:opacity-60"
              >
                <span className="line-clamp-2">{row.before || "(empty)"}</span>
                {row._createdDate ? (
                  <span className="text-[10px] text-cf-muted">
                    {formatRelativeTime(row._createdDate)}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="text-xs text-red-600"
          data-testid="editable-text-error"
        >
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={closeAll}
          disabled={pending}
          className="inline-flex h-8 items-center justify-center rounded-md border border-cf-divider px-3 text-xs font-medium text-cf-ink hover:bg-cf-cream/40 disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </span>
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

function UndoIcon() {
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
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-15-6.7L3 13" />
    </svg>
  );
}

