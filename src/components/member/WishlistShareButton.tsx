"use client";

// cf-u89z: Share button on the dashboard wishlist page.
// Calls generateShareToken (Server Action) on click, then writes the
// resulting /wishlist-share/[token] URL to the clipboard. (cfw-9vs
// renamed the public surface to disambiguate from the auth /wishlist.)

import { useState, useTransition } from "react";
import { generateShareToken } from "@/app/actions/wishlist";

type State = "idle" | "pending" | "copied" | "error";

export function WishlistShareButton({ loadFailed }: { loadFailed?: boolean }) {
  const [state, setState] = useState<State>("idle");
  const [, startTransition] = useTransition();

  if (loadFailed) return null;

  function handleClick() {
    if (state === "pending" || state === "copied") return;
    setState("pending");
    startTransition(async () => {
      const resetLater = () => setTimeout(() => setState("idle"), 3000);
      try {
        const result = await generateShareToken();
        if (!result.success) {
          setState("error");
          resetLater();
          return;
        }
        const url = `${window.location.origin}/wishlist-share/${result.token}`;
        await navigator.clipboard.writeText(url);
        setState("copied");
        resetLater();
      } catch {
        setState("error");
        resetLater();
      }
    });
  }

  const label =
    state === "pending"
      ? "Generating…"
      : state === "copied"
        ? "Link copied!"
        : state === "error"
          ? "Try again"
          : "Share wishlist";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === "pending"}
      aria-label="Copy shareable wishlist link to clipboard"
      data-testid="wishlist-share-button"
      className="rounded border border-cf-espresso/30 px-3 py-1.5 text-sm text-cf-espresso transition hover:bg-cf-espresso/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2 disabled:opacity-50"
    >
      {label}
    </button>
  );
}
