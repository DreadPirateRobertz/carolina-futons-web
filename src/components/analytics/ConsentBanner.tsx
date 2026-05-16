"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";

import { setConsentChoice } from "@/app/actions/consent";
import {
  CONSENT_COOKIE_NAME,
  consentMapFor,
  isConsentChoice,
  isConsentGrantMap,
  type ConsentChoice,
} from "@/lib/consent/consent-state";

// cf-zhkr / cfw-pa1: bottom-anchored full-width sticky bar for first-time
// visitors. Renders only when the parsed cookie choice is "unknown" —
// the cookie set by setConsentChoice() flips the parse result and the
// banner stays hidden thereafter. The bar spans the full viewport so it
// never overlaps right-column content or stacks under a newsletter modal
// (cfw-y2i.2 visual-parity finding).
//
// cf-0klm: self-contained — no initialChoice prop. Reads document.cookie
// in the mount-only useEffect so layout.tsx + ConsentMode can stay
// cookies()-free (ISR-eligible). The first client render sees
// mounted=false and returns null — by the time mounted flips true,
// `choice` has been hydrated from the cookie in the same effect.
//
// Accept / Reject both: (1) call the Server Action to persist the choice
// in cf_consent (so the next page load's ConsentClientBoot sees the
// stored choice + emits update), AND (2) emit gtag('consent', 'update',
// ...) immediately for the current page so downstream pixels see the
// new state without a full reload.

function readChoiceFromCookie(): ConsentChoice {
  if (typeof document === "undefined") return "unknown";
  for (const entry of document.cookie.split(";")) {
    const [name, ...rest] = entry.trim().split("=");
    if (name !== CONSENT_COOKIE_NAME) continue;
    let raw: string;
    try {
      raw = decodeURIComponent(rest.join("="));
    } catch {
      raw = rest.join("=");
    }
    if (isConsentChoice(raw)) return raw;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (isConsentGrantMap(parsed)) return "granted";
    } catch {
      // fall through
    }
    return "unknown";
  }
  return "unknown";
}

export function ConsentBanner() {
  const [choice, setChoice] = useState<ConsentChoice>(
    () => readChoiceFromCookie(),
  );
  const [pending, startTransition] = useTransition();

  // Defer the banner to post-hydration so a cached HTML shell served to a
  // known user can't briefly flash the banner before the Server Action's
  // cookie hits the next request. The lazy useState initializer above
  // hydrates `choice` client-side on mount (SSR-safe: readChoiceFromCookie
  // returns "unknown" when document is undefined).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (choice !== "unknown" || !mounted) return null;

  function applyChoice(next: Exclude<ConsentChoice, "unknown">) {
    if (pending) return;
    startTransition(async () => {
      const result = await setConsentChoice(next);
      if (!result.ok) return;
      setChoice(next);
      // Update gtag for the current page so any pixels already on the
      // page see the new state. window.gtag is shimmed by ConsentMode's
      // beforeInteractive snippet, so it's always callable here.
      const w = window as unknown as {
        gtag?: (
          cmd: "consent",
          action: "update",
          map: Record<string, string>,
        ) => void;
      };
      w.gtag?.("consent", "update", consentMapFor(next));
    });
  }

  return (
    <aside
      role="region"
      aria-label="Privacy preferences"
      data-slot="consent-banner"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-cf-divider bg-white dark:bg-cf-cream dark:border-cf-ink/30 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.15)]"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 sm:py-4">
        <p className="text-sm text-cf-ink">
          We use cookies to understand how this site is used and to improve your
          experience. You can change your choice anytime on our{" "}
          <Link href="/privacy" className="underline hover:no-underline">
            privacy page
          </Link>
          .
        </p>
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-end">
          <button
            type="button"
            onClick={() => applyChoice("granted")}
            disabled={pending}
            className="inline-flex h-9 items-center justify-center rounded-md bg-cf-cta px-4 text-sm font-medium text-white transition-colors hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
          >
            Accept all
          </button>
          <button
            type="button"
            onClick={() => applyChoice("denied")}
            disabled={pending}
            className="inline-flex h-9 items-center justify-center rounded-md border border-cf-divider px-4 text-sm font-medium text-cf-ink transition-colors hover:bg-cf-cream/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
          >
            Reject all
          </button>
          <Link
            href="/privacy"
            className="inline-flex h-9 items-center justify-center px-2 text-sm font-medium text-cf-muted underline-offset-2 hover:text-cf-ink hover:underline"
          >
            Manage preferences
          </Link>
        </div>
      </div>
    </aside>
  );
}
