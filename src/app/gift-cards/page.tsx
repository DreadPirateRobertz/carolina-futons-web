import type { Metadata } from "next";
import { Gift } from "lucide-react";
import { listGiftCards } from "@/lib/wix/products";
import { GiftCardPicker } from "@/components/gift-cards/GiftCardPicker";
import { DEFAULT_OG_IMAGE } from "@/lib/og";
import { twitterFromOpenGraph } from "@/lib/seo/twitter-from-og";

const DESCRIPTION =
  "Give the gift of a great night's sleep. Carolina Futons gift cards are redeemable on any purchase in-store or online.";

const OG = {
  title: "Gift Cards — Carolina Futons",
  description: DESCRIPTION,
  images: [DEFAULT_OG_IMAGE],
};

export const metadata: Metadata = {
  title: "Gift Cards — Carolina Futons",
  description: DESCRIPTION,
  alternates: { canonical: "/gift-cards" },
  openGraph: OG,
  // cf-e55k: mirror OG into twitter so Twitter unfurls match other crawlers.
  twitter: twitterFromOpenGraph(OG),
};

export default async function GiftCardsPage() {
  const cards = await listGiftCards();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      {/* Header */}
      <div className="mb-10 flex items-start gap-4">
        <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cf-espresso text-white dark:bg-cf-cream dark:text-cf-espresso">
          <Gift className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-cf-espresso dark:text-cf-cream">
            Gift Cards
          </h1>
          <p className="mt-2 text-cf-charcoal/70 dark:text-cf-cream/70">
            {DESCRIPTION}
          </p>
        </div>
      </div>

      <GiftCardPicker cards={cards} />

      {/* Redeem note */}
      <div className="mt-12 rounded-lg border border-cf-smoke bg-cf-sand/30 px-5 py-4 dark:border-cf-cream/20 dark:bg-cf-sand/60">
        <h2 className="text-sm font-semibold text-cf-espresso dark:text-cf-cream">
          Redeeming a gift card?
        </h2>
        <p className="mt-1 text-sm text-cf-charcoal/70 dark:text-cf-cream/70">
          Enter your gift card code at checkout. Gift cards are applied before
          any other payment method and can be combined with promotions.
        </p>
      </div>
    </main>
  );
}
