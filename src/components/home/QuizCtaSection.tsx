// cf-e4vd: Quiz CTA section — style quiz entry point on the home page.
// Static server component; no data fetching needed.

export function QuizCtaSection() {
  return (
    <section
      aria-label="Find your perfect futon"
      data-slot="quiz-cta"
      className="border-t border-cf-divider bg-cf-cream"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-4 px-4 py-12 text-center sm:px-6 lg:px-8">
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-cf-espresso sm:text-3xl">
          Not sure where to start?
        </h2>
        <p className="max-w-xl text-sm text-cf-muted sm:text-base">
          Answer five quick questions and we&apos;ll match you with the frame, mattress,
          and fabric that fits your room, your budget, and how you actually use your futon.
        </p>
        <a
          href="/style-quiz"
          className="mt-2 inline-flex items-center rounded-md bg-cf-espresso px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cf-espresso/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-espresso focus-visible:ring-offset-2"
        >
          Find your perfect futon
        </a>
      </div>
    </section>
  );
}
