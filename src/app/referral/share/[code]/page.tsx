import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getReferralByCodeAction } from "@/app/actions/referral";
import { ReferralShareBanner } from "@/components/referral/ReferralShareBanner";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const result = await getReferralByCodeAction(code);
  const name = result.success ? result.referral.referrerName : undefined;
  const title = name
    ? `${name} invited you — 5% off at Carolina Futons`
    : "You're invited — 5% off at Carolina Futons";
  return {
    title,
    description:
      "Get 5% off your first order of American-made futons, frames, and mattresses from Carolina Futons.",
  };
}

export default async function ReferralSharePage({ params }: Props) {
  const { code } = await params;
  const result = await getReferralByCodeAction(code);

  if (!result.success || !result.referral.valid) notFound();

  return (
    <main className="w-full min-h-screen bg-cf-cream/30">
      <ReferralShareBanner code={code} referral={result.referral} />
    </main>
  );
}
