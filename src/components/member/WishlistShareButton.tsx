"use client";

// cf-u89z: Share button on the dashboard wishlist page.
// Calls generateShareToken (Server Action) on click, then writes the
// resulting /wishlist/[token] URL to the clipboard.

import { useState, useTransition } from "react";
import { generateShareToken } from "@/app/actions/wishlist";

type State = "idle" | "pending" | "copied" | "error";

export function WishlistShareButton() {
  const [state, setState] = useState<State>("idle");
  const [, startTransition] = useTransition();

  function handleClick() {
    if (state === "pending" || state === "copied") return;
    setState("pending");
    startTransition(async () => {
      try {
        const result = await generateShareToken();
        if (!result.success) {
          setState("error");
          return;
        }
        const url = `${window.location.origin}/wishlist/${result.token}`;
        await navigator.clipboard.writeText(url);
        setState("copied");
        setTimeout(() => setState("idle"), 3000);
      } catch {
        setState("error");
        setTimeout(() => setState("idle"), 3000);
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
      className="rounded border border-cf-espresso/30 px-3 py-1.5 text-sm text-cf-espresso transition hover:bg-cf-espresso/5 disabled:opacity-50"
    >
      {label}
    </button>
  );
}
