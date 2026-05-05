"use client";

import { useState } from "react";
import type { ReferralStats } from "@/app/actions/referral";

type Props = {
  code: string;
  shareUrl: string;
  stats: ReferralStats;
};

export function ReferralDashboard({ code, shareUrl, stats }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Get 5% off at Carolina Futons",
          text: "I found my perfect futon at Carolina Futons. Use my link for 5% off your first order!",
          url: shareUrl,
        });
        return;
      } catch {
        // fall through to clipboard copy on cancel/error
      }
    }
    await handleCopy();
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard blocked — show the URL for manual copy
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 font-source-sans sm:px-6">
      <header className="mb-10 space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
          Referral Program
        </p>
        <h1 className="font-playfair text-3xl font-semibold tracking-tight text-cf-ink sm:text-4xl">
          Share &amp; Earn
        </h1>
        <p className="max-w-prose text-base text-cf-muted">
          Give friends 5% off their first order. Earn a $25 store credit when
          they complete a purchase.
        </p>
      </header>

      <section
        aria-labelledby="referral-code-heading"
        className="mb-8 rounded-xl border border-cf-ink/10 bg-white dark:bg-cf-cream dark:border-cf-ink/30 p-6 shadow-sm"
      >
        <h2
          id="referral-code-heading"
          className="mb-3 text-sm font-medium text-cf-ink"
        >
          Your referral link
        </h2>
        <p
          aria-label="Your referral link"
          className="mb-4 break-all rounded-md bg-cf-cream/50 px-4 py-2.5 text-sm font-mono text-cf-ink"
        >
          {shareUrl}
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleShare}
            className="rounded-md bg-cf-cta px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2"
          >
            Share link
          </button>
          <button
            type="button"
            onClick={handleCopy}
            aria-live="polite"
            className="rounded-md border border-cf-ink/20 bg-white dark:bg-cf-cream px-5 py-2.5 text-sm font-medium text-cf-ink transition-colors hover:bg-cf-cream/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>

        <p className="mt-3 text-xs text-cf-muted">
          Referral code: <span className="font-mono font-medium">{code}</span>
        </p>
      </section>

      <section aria-labelledby="referral-stats-heading">
        <h2
          id="referral-stats-heading"
          className="mb-4 text-sm font-medium text-cf-ink"
        >
          Your stats
        </h2>
        <dl className="grid grid-cols-3 gap-4">
          <StatCard
            label="Total referrals"
            value={stats.totalReferrals}
          />
          <StatCard
            label="Pending rewards"
            value={`$${stats.pendingRewards}`}
          />
          <StatCard
            label="Rewards earned"
            value={`$${stats.earnedRewards}`}
          />
        </dl>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-cf-ink/10 bg-white dark:bg-cf-cream dark:border-cf-ink/30 p-4 text-center shadow-sm">
      <dt className="text-xs text-cf-muted">{label}</dt>
      <dd className="mt-1 font-playfair text-2xl font-semibold text-cf-ink">
        {value}
      </dd>
    </div>
  );
}
