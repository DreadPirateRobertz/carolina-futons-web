"use client";

import { useState } from "react";
import Link from "next/link";

// Rejects protocol-relative (//evil.com), backslash-bypass (/\evil.com —
// browsers normalize /\ to // on window.location assignment), and absolute
// URLs. Applied to both the outgoing callbackUrl and the incoming redirectTo
// so neither leg can carry an open-redirect payload.
function safeNext(next: string | undefined): string {
  if (next && /^\/[^/\\]/.test(next)) return next;
  return "/dashboard";
}

// Client-only sign-in widget. Extracted from the `/account` page so the page
// itself can be a server component and export `metadata` (Next.js app-router
// disallows metadata exports from `"use client"` modules — cf-3qt.8.A.F1).
export function AccountSignIn({ next }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyPending, setVerifyPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const dest = safeNext(next);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, callbackUrl: dest }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        redirectTo?: string;
        error?: string;
        state?: string;
      };

      if (data.state === "email_verification_required") {
        // Account requires email verification before first sign-in. The
        // member's registered email will have a verification link from Wix.
        setVerifyPending(true);
        setLoading(false);
        return;
      }
      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }
      if (data.ok) {
        window.location.href = safeNext(
          typeof data.redirectTo === "string" ? data.redirectTo : undefined,
        );
        return;
      }
      throw new Error("unexpected_response");
    } catch (err) {
      console.error("[AccountSignIn] login failed", err);
      setError("Sign-in failed. Please try again.");
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
          <p className="mt-4 text-sm text-cf-charcoal/80 dark:text-cf-charcoal">
            We sent a verification link to <strong>{email}</strong>. Click it to
            activate your account, then return here to sign in.
          </p>
          <button
            type="button"
            onClick={() => setVerifyPending(false)}
            className="mt-6 text-sm text-cf-cta underline underline-offset-2"
          >
            Back to sign in
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-cf-navy">
          Sign in
        </h1>
        <p className="mt-3 text-sm text-cf-charcoal/80 dark:text-cf-charcoal">
          Access your orders, wishlist, and account settings.
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-cf-charcoal/20 bg-white px-3 py-2 text-sm text-cf-espresso placeholder-cf-charcoal/40 shadow-sm focus:border-cf-cta focus:outline-none focus:ring-1 focus:ring-cf-cta dark:bg-cf-cream dark:text-cf-ink dark:placeholder-cf-muted"
              placeholder="••••••••"
            />
            <div className="mt-2 text-right">
              <Link
                href="/account/forgot-password"
                className="text-xs text-cf-cta underline underline-offset-2"
              >
                Forgot your password?
              </Link>
            </div>
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
            {loading ? "Signing in…" : "Sign in to Carolina Futons"}
          </button>
        </form>

        {/* WCAG AA contrast + non-color link affordance.
            /60 measures ~4.4:1 contrast on this 12px copy — just under
            AA's 4.5:1 floor; /80 clears it. Persistent `underline` on
            the inline Links satisfies WCAG 1.4.1 (links must be
            distinguishable by more than color alone) so users with
            color-vision differences still see the link affordance
            without hovering. */}
        <p className="mt-6 text-center text-xs text-cf-charcoal/80 dark:text-cf-charcoal">
          Already signed in?{" "}
          <Link
            href="/dashboard"
            className="text-cf-cta underline underline-offset-2"
          >
            Go to your dashboard
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-cf-charcoal/80 dark:text-cf-charcoal">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-cf-cta underline underline-offset-2"
          >
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
