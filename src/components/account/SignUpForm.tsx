"use client";

import { useState } from "react";
import Link from "next/link";

import { logError } from "@/lib/observability/log";

export function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyPending, setVerifyPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, callbackUrl: "/dashboard" }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        redirectTo?: string;
        error?: string;
        state?: string;
      };

      // Both `email_verification_required` and the legacy
      // `registered_sign_in_required` (cfw-aik) collapse onto the verify-email
      // screen — we never want to claim "Account created. Sign in to continue."
      // when subsequent sign-in will silently fail.
      if (
        data.state === "email_verification_required" ||
        data.state === "registered_sign_in_required"
      ) {
        setVerifyPending(true);
        setLoading(false);
        return;
      }
      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }
      if (data.ok && typeof data.redirectTo === "string") {
        // Fire welcome email trigger — best-effort, must not block redirect.
        try {
          void fetch("/api/email/trigger", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ type: "welcome", email }),
            keepalive: true,
          });
        } catch {
          // intentionally swallowed — trigger must never block the redirect
        }
        window.location.href = data.redirectTo;
        return;
      }
      throw new Error("unexpected_response");
    } catch (err) {
      logError("SignUpForm", "register failed", err);
      setError("Sign-up failed. Please try again.");
      setLoading(false);
    }
  }

  if (verifyPending) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm text-center">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-cf-navy">
            Check your email
          </h1>
          <p className="mt-4 text-sm text-cf-charcoal/80">
            We sent a verification link to <strong>{email}</strong>. Click it to
            activate your account, then{" "}
            <Link href="/account" className="text-cf-cta hover:underline">
              sign in
            </Link>
            .
          </p>
          <button
            type="button"
            onClick={() => setVerifyPending(false)}
            className="mt-6 text-sm text-cf-cta hover:underline"
          >
            Back to sign up
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-cf-navy">
          Create an account
        </h1>
        <p className="mt-3 text-sm text-cf-charcoal/80">
          Save your wishlist, track orders, and manage preferences.
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

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-cf-charcoal"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-cf-charcoal/20 bg-white px-3 py-2 text-sm text-cf-espresso placeholder-cf-charcoal/40 shadow-sm focus:border-cf-cta focus:outline-none focus:ring-1 focus:ring-cf-cta dark:bg-cf-cream dark:text-cf-ink dark:placeholder-cf-muted"
              placeholder="8+ characters"
            />
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="block text-sm font-medium text-cf-charcoal"
            >
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 block w-full rounded-md border border-cf-charcoal/20 bg-white px-3 py-2 text-sm text-cf-espresso placeholder-cf-charcoal/40 shadow-sm focus:border-cf-cta focus:outline-none focus:ring-1 focus:ring-cf-cta dark:bg-cf-cream dark:text-cf-ink dark:placeholder-cf-muted"
              placeholder="••••••••"
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
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-cf-charcoal/60">
          Already have an account?{" "}
          <Link href="/account" className="text-cf-cta hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
