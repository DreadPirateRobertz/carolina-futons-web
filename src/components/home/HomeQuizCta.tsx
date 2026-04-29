import Link from "next/link";

export function HomeQuizCta() {
  return (
    <section className="border-t border-cf-divider bg-cf-sand/30 py-16">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-cf-espresso/60">
              Not sure where to start?
            </p>
            <h2 className="mt-2 font-heading text-2xl font-bold text-cf-espresso sm:text-3xl">
              Find Your Perfect Futon
            </h2>
            <p className="mt-3 text-base text-cf-espresso/80 leading-relaxed">
              Answer five quick questions about your space, style, and budget.
              We&rsquo;ll match you to the right frame from our American-made collection.
            </p>
          </div>

          <Link
            href="/style-quiz"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-cf-espresso px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cf-espresso/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cf-espresso"
          >
            Start the quiz
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
