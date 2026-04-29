import Link from "next/link";

export function HomeGiftCardCta() {
  return (
    <section className="border-t border-cf-divider bg-cf-espresso/5 py-14">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <div className="max-w-lg">
            <p className="text-xs font-semibold uppercase tracking-widest text-cf-espresso/60">
              Give the gift of comfort
            </p>
            <h2 className="mt-2 font-heading text-2xl font-bold text-cf-espresso">
              Carolina Futons Gift Cards
            </h2>
            <p className="mt-3 text-base text-cf-espresso/80 leading-relaxed">
              Redeemable on any furniture we carry — futons, Murphy beds,
              mattresses, and more. No expiration fees, no catches. Starting at $25.
            </p>
          </div>

          <Link
            href="/gift-cards"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border-2 border-cf-espresso px-7 py-3.5 text-sm font-semibold text-cf-espresso transition-colors hover:bg-cf-espresso hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cf-espresso"
          >
            View gift cards
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
