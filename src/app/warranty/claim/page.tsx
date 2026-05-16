// cfw-80n1: /warranty/claim — server-rendered shell, member-gated.
// Companion to cfw-1ud /warranty/register: where register captures the
// purchase, claim captures the issue that triggered support. Reads
// optional pre-fill from PdpWarrantyInfo or WarrantyInfoWidget CTAs.

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getMemberSession } from "@/lib/auth/member";
import { DEFAULT_OG_IMAGE } from "@/lib/og";

import { WarrantyClaimForm } from "./WarrantyClaimForm";

const TITLE = "File a warranty claim — Carolina Futons";
const DESCRIPTION =
  "File a Carolina Futons warranty claim. Member sign-in required.";

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

export const dynamic = "force-dynamic";

type SearchParams = {
  warrantyId?: string;
  productName?: string;
};

/**
 * Server-rendered claim shell.
 *
 * @param props Next.js page props. `searchParams` carries optional
 *   pre-fill (warrantyId from a /dashboard/warranties row; productName
 *   from PdpWarrantyInfo CTA).
 * @returns Signed-in member's claim form, or redirect to /account for
 *   signed-out visitors.
 *
 * WHY pre-fill: matches cfw-1ud + Wix WarrantyInfoWidget CTA pattern
 * where the PDP "File a claim" button hands off product + registration
 * context already populated.
 */
export default async function WarrantyClaimPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getMemberSession();
  if (!session) {
    redirect("/account?next=/warranty/claim");
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
            File a warranty claim
          </h1>
          <p className="text-lg leading-relaxed text-cf-muted">
            Tell us what&apos;s going on and we&apos;ll get back to you within
            one business day. Photos can be emailed after we open the
            case.
          </p>
        </header>

        <WarrantyClaimForm
          initialWarrantyId={search.warrantyId ?? ""}
          initialProductName={search.productName ?? ""}
        />
      </article>
    </main>
  );
}
