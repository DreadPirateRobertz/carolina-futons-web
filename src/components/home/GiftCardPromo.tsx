import Link from "next/link";

export function GiftCardPromo() {
  return (
    <section
      data-slot="gift-card-promo"
      aria-labelledby="gift-card-promo-heading"
      className="border-t border-cf-divider bg-cf-navy dark:bg-cf-sand dark:text-cf-ink"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-6 px-4 py-14 text-center sm:px-6 lg:px-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/50">
          Give the gift of sleep
        </p>
        <h2
          id="gift-card-promo-heading"
          className="font-heading text-2xl font-semibold text-white sm:text-3xl"
        >
          Carolina Futons Gift Cards
        </h2>
        <p className="max-w-prose text-base leading-relaxed text-white/70">
          From $50 to $500 — let them choose their own frame, mattress, or
          accessories. Delivered instantly by email, redeemable online or
          in-store.
        </p>
        <Link
          href="/gift-cards"
          className="inline-flex items-center rounded-md border border-white/30 bg-white/10 px-7 py-3 text-sm font-medium text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-cf-navy"
        >
          Shop Gift Cards →
        </Link>
      </div>
    </section>
  );
}
