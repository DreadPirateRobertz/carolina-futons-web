"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";

import { setConsentChoice } from "@/app/actions/consent";
import {
  consentMapFor,
  type ConsentChoice,
} from "@/lib/consent/consent-state";

export type ConsentBannerProps = {
  initialChoice: ConsentChoice;
};

// cf-zhkr: bottom slide-in banner for first-time visitors. Renders only
// when the server-rendered initialChoice is "unknown" — the cookie set
// by setConsentChoice() flips initialChoice on the next request and the
// banner stays hidden thereafter.
//
// Accept / Reject both: (1) call the Server Action to persist the choice
// in cf_consent (so the next page load emits the correct
// gtag('consent', 'default', ...) inline before pixels), AND (2) emit
// gtag('consent', 'update', ...) immediately for the current page so
// downstream pixels see the new state without a full reload.

export function ConsentBanner({ initialChoice }: ConsentBannerProps) {
  const [choice, setChoice] = useState<ConsentChoice>(initialChoice);
  const [pending, startTransition] = useTransition();

  // Defer the banner to post-hydration so a cached HTML shell served to a
  // known user can't briefly flash the banner before the Server Action's
  // cookie hits the next request. useState's lazy initializer can't read
  // window.document during SSR (always undefined), so the first client
  // render sees mounted=false → renders null → effect flips to true on
  // the next paint.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only flag; lazy init is unsafe during SSR
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
      className="fixed inset-x-2 bottom-2 z-50 mx-auto max-w-3xl rounded-lg border border-cf-divider bg-white p-4 shadow-lg sm:inset-x-auto sm:right-4 sm:left-auto sm:w-[28rem] dark:bg-cf-cream"
    >
      <p className="text-sm text-cf-ink">
        We use cookies to understand how this site is used and to improve your
        experience. You can change your choice anytime on our{" "}
        <Link href="/privacy" className="underline hover:no-underline">
          privacy page
        </Link>
        .
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
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
    </aside>
  );
}
