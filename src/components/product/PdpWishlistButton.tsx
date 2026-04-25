"use client";

import { useState, useTransition } from "react";

import { addToWishlistFromPdp } from "@/app/actions/wishlist";

export type PdpWishlistButtonProps = {
  productId: string;
  productName: string;
  price: number;
  productSlug: string;
  imageUrl?: string;
  variantId?: string;
};

// cf-mrtl: PDP wishlist entry point. Closes the loop opened by cf-rs9k —
// without this the dashboard list view at /dashboard/wishlist has no way
// to gain items from a normal customer flow. Renders for both logged-in
// and logged-out visitors. Logged-out clicks kick off the OAuth round-trip
// via the existing /api/auth/session POST; the post-login destination is
// the PDP itself so the customer returns to where they were.

type State =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "added" }
  | { kind: "error"; message: string };

export function PdpWishlistButton({
  productId,
  productName,
  price,
  productSlug,
  imageUrl,
  variantId,
}: PdpWishlistButtonProps) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [, startTransition] = useTransition();

  function handleClick() {
    if (state.kind === "added" || state.kind === "pending") return;
    setState({ kind: "pending" });
    startTransition(async () => {
      try {
        const result = await addToWishlistFromPdp(
          productId,
          productName,
          price,
          { variantId, image: imageUrl },
        );
        if (result.success) {
          setState({ kind: "added" });
          return;
        }
        if (result.requiresAuth) {
          await redirectToSignIn(`/products/${productSlug}`);
          return;
        }
        setState({ kind: "error", message: result.error });
      } catch {
        setState({
          kind: "error",
          message: "Could not save. Please try again.",
        });
      }
    });
  }

  const label =
    state.kind === "added"
      ? `Saved ${productName} to wishlist`
      : `Save ${productName} to wishlist`;

  return (
    <div data-slot="pdp-wishlist" className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={handleClick}
        disabled={state.kind === "pending"}
        aria-pressed={state.kind === "added"}
        aria-label={label}
        data-state={state.kind}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-cf-divider bg-white px-5 text-sm font-medium text-cf-ink transition-colors hover:bg-cf-cream/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 data-[state=added]:border-cf-cta data-[state=added]:text-cf-cta"
      >
        <span aria-hidden="true">
          {state.kind === "added" ? "♥" : "♡"}
        </span>
        <span>{state.kind === "added" ? "Saved" : "Save"}</span>
      </button>
      {state.kind === "error" ? (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}

async function redirectToSignIn(returnTo: string): Promise<void> {
  // Mirrors the AccountSignIn client widget's bootstrap. The /api/auth/session
  // POST returns the Wix OAuth authUrl; we hand the user off to it directly
  // so the post-login redirect lands them back on the PDP.
  try {
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callbackUrl: returnTo }),
    });
    if (!res.ok) throw new Error(`auth_init_failed: HTTP ${res.status}`);
    const data = (await res.json()) as { authUrl?: unknown };
    if (typeof data.authUrl !== "string" || data.authUrl === "") {
      throw new Error("auth_init_failed: missing authUrl");
    }
    window.location.href = data.authUrl;
  } catch (err) {
    console.error("[PdpWishlistButton] sign-in init failed", err);
    // Fallback: hard-navigate to the in-app sign-in page so the user can
    // click through manually.
    window.location.href = `/account?return_to=${encodeURIComponent(returnTo)}`;
  }
}
