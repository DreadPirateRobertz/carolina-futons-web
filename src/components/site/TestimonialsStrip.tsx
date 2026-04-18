// Home-page social-proof strip. Three curated customer quotes rendered
// between the Featured products section and the value-prop band. Data is
// static by design — these are editorial highlights, not a live review feed
// (that's cf-3qt.6.F.reviews territory and hits the Wix Reviews SDK).
//
// Surface uses bg-cf-sand/40 + border-cf-divider to match the Value-Props
// band immediately below, so the two sections read as one warm "brand
// voice" block at the bottom of the home page. The Playfair quote text
// (font-heading italic) gives each card the editorial weight CF's paid
// magazine ads use.

type Testimonial = {
  quote: string;
  name: string;
  city: string;
};

export const TESTIMONIALS: ReadonlyArray<Testimonial> = [
  {
    quote:
      "The hardwood frame is heavier than the whole apartment. Ten years in and not a single squeak — this thing is going to outlive me.",
    name: "Sarah M.",
    city: "Asheville, NC",
  },
  {
    quote:
      "Drove up from Charlotte to the Hendersonville showroom on a Saturday. Got to try every mattress, no one breathing down our neck. Delivery team set it up in our guest room two weeks later.",
    name: "David & Jenna K.",
    city: "Charlotte, NC",
  },
  {
    quote:
      "The Murphy cabinet bed is the reason we can actually host family. Folds away spotless, looks like an armoire, and the mattress is better than the one in our primary bedroom.",
    name: "Michelle R.",
    city: "Greenville, SC",
  },
];

function StarRating() {
  // Role=img with an accessible name keeps the rating readable by screen
  // readers without exposing each glyph individually. The 5 filled stars
  // are the visual affordance; the aria-label is the semantic one.
  return (
    <span
      role="img"
      aria-label="5 out of 5 stars"
      className="text-base leading-none text-cf-cta"
    >
      ★★★★★
    </span>
  );
}

export function TestimonialsStrip() {
  return (
    <section
      aria-labelledby="testimonials-heading"
      role="region"
      aria-label="What customers are saying"
      className="border-t border-cf-divider bg-cf-sand/40"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2
          id="testimonials-heading"
          className="font-heading text-2xl font-semibold text-cf-navy sm:text-3xl"
        >
          What customers are saying
        </h2>
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <li
              key={t.name}
              data-testid="testimonial"
              className="flex h-full flex-col justify-between rounded-lg border border-cf-divider bg-cf-cream p-6 shadow-sm"
            >
              <div>
                <StarRating />
                <blockquote className="mt-4 font-heading text-lg italic leading-snug text-cf-navy">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
              </div>
              <footer className="mt-6 text-sm text-cf-charcoal/80">
                <span className="font-medium text-cf-navy">{t.name}</span>
                <span aria-hidden="true"> · </span>
                <span>{t.city}</span>
              </footer>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
