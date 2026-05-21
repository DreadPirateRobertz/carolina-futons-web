"use client";

import { useState } from "react";
import Link from "next/link";

import { logError } from "@/lib/observability/log";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      setSent(true);
      setLoading(false);
    } catch (err) {
      logError("ForgotPasswordForm", "submit failed", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm text-center">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-cf-navy">
            Check your email
          </h1>
          <p className="mt-4 text-sm text-cf-charcoal/80">
            If an account exists for <strong>{email}</strong>, a password reset
            link is on its way. The link is good for 3 hours.
          </p>
          <Link
            href="/account"
            className="mt-6 inline-block text-sm text-cf-cta underline underline-offset-2"
          >
            Back to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-cf-navy">
          Forgot your password?
        </h1>
        <p className="mt-3 text-sm text-cf-charcoal/80">
          Enter your account email and we&apos;ll send a link to reset your
          password.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-cf-charcoal"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-cf-charcoal/20 bg-white px-3 py-2 text-sm text-cf-espresso placeholder-cf-charcoal/40 shadow-sm focus:border-cf-cta focus:outline-none focus:ring-1 focus:ring-cf-cta dark:bg-cf-cream dark:text-cf-ink dark:placeholder-cf-muted"
              placeholder="you@example.com"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full h-12 items-center justify-center rounded-md bg-cf-cta px-6 text-sm font-medium text-white shadow-sm transition-colors hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>

        {/* Same WCAG AA contrast + non-color link affordance fix as
            AccountSignIn — /60 measures ~4.4:1 (under AA's 4.5:1
            floor); persistent underline satisfies WCAG 1.4.1. */}
        <p className="mt-6 text-center text-xs text-cf-charcoal/80 dark:text-cf-charcoal">
          Remembered it?{" "}
          <Link href="/account" className="text-cf-cta underline underline-offset-2">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
