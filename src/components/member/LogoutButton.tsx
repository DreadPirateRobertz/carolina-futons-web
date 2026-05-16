"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleLogout() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/session", { method: "DELETE" });
        if (!res.ok) {
          setError("Could not sign out. Please try again.");
          return;
        }
        const body = (await res.json()) as { ok: boolean; logoutUrl?: string };
        if (body.logoutUrl) {
          window.location.href = body.logoutUrl;
        } else {
          router.push("/");
          router.refresh();
        }
      } catch {
        setError("Could not sign out. Please try again.");
      }
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleLogout}
        disabled={pending}
        data-testid="logout-button"
        className="rounded-md border border-cf-espresso/30 px-4 py-2 text-sm font-medium text-cf-espresso transition hover:bg-cf-espresso/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2 disabled:opacity-50"
      >
        {pending ? "Signing out…" : "Sign out"}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
