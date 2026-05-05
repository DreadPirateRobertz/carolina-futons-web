import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getMemberSession } from "@/lib/auth/member";
import { getMyReferralCodeAction, getMyReferralStatsAction } from "@/app/actions/referral";
import { ReferralDashboard } from "@/components/referral/ReferralDashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Referral Program — Carolina Futons",
  description:
    "Share your referral link and earn store credit when friends place their first order.",
};

export default async function ReferralPage() {
  const session = await getMemberSession();
  if (!session) redirect("/account?next=/referral");

  const [codeResult, statsResult] = await Promise.all([
    getMyReferralCodeAction(),
    getMyReferralStatsAction(),
  ]);

  if (!codeResult.success) {
    return (
      <main className="w-full min-h-screen bg-cf-cream/30">
        <div className="mx-auto max-w-lg px-4 py-16 text-center font-source-sans text-cf-muted">
          <p>Your referral code is not available right now. Please try again shortly.</p>
        </div>
      </main>
    );
  }

  const stats = statsResult.success
    ? statsResult.stats
    : { totalReferrals: 0, pendingRewards: 0, earnedRewards: 0 };

  const shareUrl = `/referral/share/${codeResult.code}`;

  return (
    <main className="w-full min-h-screen bg-cf-cream/30">
      <ReferralDashboard
        code={codeResult.code}
        shareUrl={shareUrl}
        stats={stats}
      />
    </main>
  );
}
