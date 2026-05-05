"use client";

import Link from "next/link";
import { useState } from "react";
import { claimReferralAction } from "@/app/actions/referral";
import type { PublicReferral } from "@/app/actions/referral";

type Props = {
  code: string;
  referral: PublicReferral;
};

export function ReferralShareBanner({ code, referral }: Props) {
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  async function handleClaim() {
    setClaiming(true);
    setClaimError(null);
    const res = await claimReferralAction(code);
    setClaiming(false);
    if (res.requiresAuth) {
      window.location.href = `/account?next=/referral/share/${code}`;
      return;
    }
    if (!res.success) {
      setClaimError(res.error ?? "Something went wrong. Please try again.");
      return;
    }
    setClaimed(true);
  }

  const discountLabel = `${referral.discountPct}% off`;
  const referrerLabel = referral.referrerName
    ? `${referral.referrerName} invited you`
    : "You've been invited";

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center font-source-sans sm:px-6">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
        {referrerLabel}
      </p>
      <h1 className="mt-3 font-playfair text-4xl font-semibold tracking-tight text-cf-ink">
        Get {discountLabel} your first order
      </h1>
      <p className="mt-4 text-base text-cf-muted">
        Shop American-made futons, frames, and mattresses — crafted in
        Hendersonville, NC.
      </p>

      <div className="mt-10 rounded-xl border-2 border-cf-cta/30 bg-cf-cta/5 px-6 py-8">
        <p className="text-5xl font-playfair font-bold text-cf-cta">
          {discountLabel}
        </p>
        <p className="mt-2 text-sm text-cf-muted">on your first purchase</p>

        {claimed ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm font-medium text-cf-ink">
              Discount applied! Start shopping.
            </p>
            <Link
              href="/shop"
              className="inline-block rounded-md bg-cf-cta px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2"
            >
              Shop now &rarr;
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={handleClaim}
              disabled={claiming}
              className="w-full rounded-md bg-cf-cta px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-cf-cta/90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2"
            >
              {claiming ? "Applying…" : `Claim ${discountLabel} discount`}
            </button>
            {claimError && (
              <p role="alert" className="text-sm text-red-600">
                {claimError}
              </p>
            )}
            <p className="text-xs text-cf-muted">
              Already have an account?{" "}
              <Link
                href={`/account?next=/referral/share/${code}`}
                className="text-cf-cta underline underline-offset-2"
              >
                Sign in to apply
              </Link>
            </p>
          </div>
        )}
      </div>

      <p className="mt-8 text-sm text-cf-muted">
        <Link href="/shop" className="text-cf-cta underline underline-offset-2">
          Browse the full collection
        </Link>{" "}
        without signing in
      </p>
    </div>
  );
}
