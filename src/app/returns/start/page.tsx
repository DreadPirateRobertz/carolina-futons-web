// cfw-9to: /returns/start — server-rendered shell that hydrates the
// StartReturnForm with pre-fill values from query params (when a CTA
// hands them off from /order-confirmation or a similar surface).
//
// WHY guest-accessible (no auth gate, robots:noindex): mirrors the Wix
// `submitGuestReturn` flow (`Permissions.Anyone`) — buyers without a
// member account still need to start a return. Indexing offers no SEO
// value (one-off transactional flow) and would confuse organic
// visitors clicking through to a form they probably can't action.

import type { Metadata } from "next";

import { DEFAULT_OG_IMAGE } from "@/lib/og";

import { StartReturnForm } from "./StartReturnForm";

const TITLE = "Start a return — Carolina Futons";
const DESCRIPTION =
  "Start a return or exchange for your Carolina Futons order. Enter your order number and email — we'll email next steps.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: false, follow: false },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
};

// Query params are dynamic per request; force-dynamic prevents Next.js
// from caching a stale shell across visitors.
export const dynamic = "force-dynamic";

type SearchParams = {
  orderNumber?: string;
  email?: string;
};

/**
 * /returns/start page shell.
 *
 * @param props Next.js page props. `searchParams` carries optional
 *   pre-fill values forwarded by /order-confirmation (or any other
 *   surface linking to /returns/start?orderNumber=…&email=…).
 * @returns The pre-filled StartReturnForm rendered inside the
 *   policy-page article shell.
 */
export default async function StartReturnPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const search = await props.searchParams;

  return (
    <main className="mx-auto w-full px-4 py-12 sm:px-6 sm:py-16">
      <article className="mx-auto max-w-[55ch] space-y-8 font-source-sans text-cf-ink">
        <header className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
            Returns
          </p>
          <h1 className="font-playfair text-4xl font-semibold tracking-tight sm:text-5xl">
            Start a return
          </h1>
          <p className="text-lg leading-relaxed text-cf-muted">
            Tell us about the issue and we&apos;ll email next steps. Returns
            are typically processed within five business days of receipt.
          </p>
        </header>

        <StartReturnForm
          initialOrderNumber={search.orderNumber ?? ""}
          initialEmail={search.email ?? ""}
        />
      </article>
    </main>
  );
}
