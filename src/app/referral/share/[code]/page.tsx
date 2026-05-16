import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getReferralByCodeAction } from "@/app/actions/referral";
import { ReferralShareBanner } from "@/components/referral/ReferralShareBanner";
import { DEFAULT_OG_IMAGE } from "@/lib/og";
import { twitterFromOpenGraph } from "@/lib/seo/twitter-from-og";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const result = await getReferralByCodeAction(code);
  const name = result.success ? result.referral.referrerName : undefined;
  const title = name
    ? `${name} invited you — 5% off at Carolina Futons`
    : "You're invited — 5% off at Carolina Futons";
  const description =
    "Get 5% off your first order of American-made futons, frames, and mattresses from Carolina Futons.";
  const og = {
    title,
    description,
    images: [DEFAULT_OG_IMAGE],
  };
  return {
    title,
    description,
    openGraph: og,
    // cf-2qxr: per-page twitter card mirror.
    twitter: twitterFromOpenGraph(og),
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
