import type { Metadata } from "next";
import Link from "next/link";
import { GiftCardBalanceChecker } from "@/components/gift-cards/GiftCardBalanceChecker";

export const metadata: Metadata = {
  title: "Gift Cards — Carolina Futons",
  description:
    "Give the gift of comfort. Carolina Futons gift cards are redeemable on futons, Murphy beds, mattresses, and accessories.",
};

const DENOMINATIONS = [25, 50, 100, 150, 200, 500] as const;

export default function GiftCardsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="space-y-14">
        {/* Header */}
        <header className="space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-cf-espresso/60">
            For the people you love
          </p>
          <h1 className="font-heading text-4xl font-bold text-cf-espresso sm:text-5xl">
            Gift Cards
          </h1>
          <p className="mx-auto max-w-xl text-lg leading-relaxed text-cf-espresso/80">
            Redeemable on any furniture or accessory we carry — futon frames,
            Murphy beds, mattresses, and more. No expiration fees, no catches.
          </p>
        </header>

        {/* Denominations */}
        <section>
          <h2 className="mb-4 font-heading text-xl font-semibold text-cf-espresso">
            Choose an amount
          </h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {DENOMINATIONS.map((amount) => (
              <Link
                key={amount}
                href="/contact"
                className="flex flex-col items-center rounded-xl border-2 border-cf-espresso/20 bg-cf-cream p-4 text-center transition-all hover:border-cf-espresso hover:bg-cf-espresso hover:text-white group"
              >
                <span className="text-xs font-medium uppercase tracking-widest text-cf-espresso/60 group-hover:text-white/70">
                  Gift card
                </span>
                <span className="mt-1 font-heading text-2xl font-bold text-cf-espresso group-hover:text-white">
                  ${amount}
                </span>
              </Link>
            ))}
          </div>
          <p className="mt-3 text-sm text-cf-espresso/60">
            To purchase a gift card, use the contact form below or call us at{" "}
            <a href="tel:+18286920070" className="underline underline-offset-2 hover:text-cf-espresso">
              (828) 692-0070
            </a>
            . We&rsquo;ll email the gift card code to the recipient.
          </p>
        </section>

        {/* How it works */}
        <section className="rounded-xl border border-cf-divider bg-cf-sand/30 p-6">
          <h2 className="mb-4 font-heading text-xl font-semibold text-cf-espresso">
            How it works
          </h2>
          <ol className="space-y-3">
            {[
              "Call us or submit a contact request with the amount and recipient's email address.",
              "We process payment and email the gift card code within 1 business day.",
              "The recipient applies the code at checkout — valid on any order.",
              "Unused balances carry forward. Cards are valid for 1 year from purchase.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-cf-espresso/80">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cf-espresso text-xs font-bold text-white">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <div className="mt-5">
            <Link
              href="/contact"
              className="inline-flex items-center gap-1.5 rounded-lg bg-cf-espresso px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cf-espresso/90"
            >
              Request a gift card
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>

        {/* Balance checker */}
        <section>
          <GiftCardBalanceChecker />
        </section>

        {/* Fine print */}
        <section className="text-xs text-cf-espresso/50 space-y-1.5 border-t border-cf-divider pt-6">
          <p>Gift cards are non-refundable and cannot be exchanged for cash.</p>
          <p>Valid for 1 year from date of purchase. No monthly fees.</p>
          <p>Lost or stolen gift cards cannot be replaced without proof of purchase.</p>
          <p>Questions? <Link href="/contact" className="underline underline-offset-2">Contact us</Link>.</p>
        </section>
      </div>
    </main>
  );
}
