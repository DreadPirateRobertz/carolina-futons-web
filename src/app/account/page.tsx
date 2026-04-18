"use client";

import { useState } from "react";
import Link from "next/link";

export default function AccountPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callbackUrl: "/dashboard" }),
      });
      if (!res.ok) throw new Error("auth_init_failed");
      const { authUrl } = (await res.json()) as { authUrl: string };
      window.location.href = authUrl;
    } catch {
      setError("Could not start sign-in. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-cf-navy">
          Sign in
        </h1>
        <p className="mt-3 text-sm text-cf-charcoal/80">
          Access your orders, wishlist, and account settings.
        </p>

        <div className="mt-8 space-y-3">
          <button
            type="button"
            onClick={handleSignIn}
            disabled={loading}
            className="inline-flex w-full h-12 items-center justify-center rounded-md bg-cf-cta px-6 text-sm font-medium text-white shadow-sm transition-colors hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Redirecting…" : "Sign in with Wix"}
          </button>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-cf-charcoal/60">
          Already signed in?{" "}
          <Link href="/dashboard" className="text-cf-cta hover:underline">
            Go to your dashboard
          </Link>
        </p>
      </div>
    </main>
  );
}
