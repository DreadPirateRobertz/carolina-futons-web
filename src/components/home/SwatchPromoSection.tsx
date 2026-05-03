// cf-ph80: Swatch promo section — fabric CTA between TrustBar and testimonials.
// Static server component; no data fetching needed.

export function SwatchPromoSection() {
  return (
    <section
      aria-label="Fabric swatches"
      data-slot="swatch-promo"
      className="border-t border-cf-divider bg-cf-sand/30"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-4 px-4 py-12 text-center sm:px-6 lg:px-8">
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-cf-espresso sm:text-3xl">
          Try before you buy — order free swatches
        </h2>
        <p className="max-w-xl text-sm text-cf-muted sm:text-base">
          Choose from 700+ Crypton performance fabrics. We&apos;ll mail up to 5 swatches
          to your door so you can feel the color and texture before committing.
        </p>
        <a
          href="/swatch-request"
          className="mt-2 inline-flex items-center rounded-md bg-cf-cta px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2"
        >
          Order free swatches
        </a>
      </div>
    </section>
  );
}
