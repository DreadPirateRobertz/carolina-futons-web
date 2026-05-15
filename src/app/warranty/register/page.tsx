// cfw-1ud: /warranty/register — server-rendered shell that gates on
// member auth and hydrates the client form with `?orderId&productId&
// productName` pre-fill values.
//
// WHY a server-rendered shell + client form (rather than a single client
// page): the auth gate lives server-side via getMemberSession, so a
// signed-out visitor gets a redirect at request time instead of a flash
// of the form before a client-side bounce. The form itself needs
// `useActionState`-equivalent behavior and so has to be a client
// component; we pass the pre-fill values down as props.

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getMemberSession } from "@/lib/auth/member";
import { DEFAULT_OG_IMAGE } from "@/lib/og";

import { WarrantyRegisterForm } from "./WarrantyRegisterForm";

const TITLE = "Register your warranty — Carolina Futons";
const DESCRIPTION =
  "Register your Carolina Futons purchase for manufacturer warranty coverage. Member sign-in required.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // Member-gated flow; do not index — keeps the page out of organic results
  // where it would frustrate signed-out visitors.
  robots: { index: false, follow: false },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
};

// Force dynamic rendering — getMemberSession reads cookies, which would
// produce a session-less prerender that incorrectly redirects every
// visitor.
export const dynamic = "force-dynamic";

type SearchParams = {
  orderId?: string;
  productId?: string;
  productName?: string;
};

/**
 * Server-rendered warranty registration shell.
 *
 * @param props Next.js page props. `searchParams` carries optional
 *   pre-fill values forwarded by /order-confirmation or PDP CTAs.
 * @returns The signed-in member's registration form, or a redirect to
 *   /account?next=/warranty/register for signed-out visitors.
 *
 * WHY pre-fill: matches the Wix `Warranty Registration.js` UX where the
 * Thank-You-Page CTA links to this page with order+product context
 * already populated (cf-9k5 P2 follow-up wires that CTA on cfw side).
 */
export default async function WarrantyRegisterPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getMemberSession();
  if (!session) {
    redirect("/account?next=/warranty/register");
  }
  const search = await props.searchParams;

  return (
    <main className="mx-auto w-full px-4 py-12 sm:px-6 sm:py-16">
      <article className="mx-auto max-w-[55ch] space-y-8 font-source-sans text-cf-ink">
        <header className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
            Warranty
          </p>
          <h1 className="font-playfair text-4xl font-semibold tracking-tight sm:text-5xl">
            Register your warranty
          </h1>
          <p className="text-lg leading-relaxed text-cf-muted">
            Tell us what you bought and when. We&apos;ll keep the record on file
            so a future warranty claim moves faster.
          </p>
        </header>

        <WarrantyRegisterForm
          initialProductId={search.productId ?? ""}
          initialProductName={search.productName ?? ""}
          initialOrderId={search.orderId ?? ""}
        />
      </article>
    </main>
  );
}
