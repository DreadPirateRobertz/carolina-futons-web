import type { Metadata } from "next";

import { ContactForm } from "@/components/contact/ContactForm";
import { ContactHero } from "@/components/illustrations/ContactHero";
import { BUSINESS } from "@/lib/business/contact-info";
import { MagneticButton } from "@/components/ui/MagneticButton";

// cf-3qt.5.6: hero + press inquiries CTA + media-contact form. The form
// reuses the shared sendContactForm Server Action so press inquiries land
// in the same Velo notification + ContactSubmissions CMS pipeline as
// general /contact submissions. ContactForm's `subjectPrefix` pre-fills
// "[Press] " into the subject field — the resulting tag is what the team
// filters on when triaging the queue. (Soft routing, not enforced — a
// reporter can clear it; on the wire it's just text.)

export const metadata: Metadata = {
  title: "Press & Media — Carolina Futons",
  description:
    "Press resources, story angles, and a direct line to Carolina Futons — a family-owned futon and natural-mattress retailer in Hendersonville, North Carolina, in business since 1991.",
};

// Revalidate at most once per day so the years-in-business claim flips
// over a Jan 1 boundary even when the page sits in static cache between
// deploys. Anything shorter is overkill for a page this static.
export const revalidate = 86400;

// `LAST_UPDATED` is maintained by hand. Update this string whenever the
// page copy changes meaningfully (story angles, contact info, hero) so
// journalists know the facts are fresh. Do NOT auto-derive from build
// time — that would tell every reporter the page changed every deploy.
const LAST_UPDATED = "April 25, 2026";

export default function PressPage() {
  // Re-derived per render so the lede ages itself across a Jan 1
  // boundary; static cache is bounded by `revalidate` above.
  const yearsInBusiness = new Date().getFullYear() - BUSINESS.foundedYear;
  return (
    <main className="w-full">
      <section
        aria-labelledby="press-headline"
        className="relative overflow-hidden bg-cf-cream"
      >
        <ContactHero className="absolute inset-x-0 bottom-0" />
        <div className="relative mx-auto w-full max-w-[65ch] px-4 pb-24 pt-12 sm:px-6 sm:pb-32 sm:pt-16">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
            Press
          </p>
          <h1
            id="press-headline"
            className="mt-2 font-playfair text-4xl font-semibold tracking-tight text-cf-ink sm:text-5xl"
          >
            Press &amp; Media
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-cf-ink">
            Carolina Futons is a {yearsInBusiness}-year-old family-owned
            retailer of solid-wood futon frames and natural mattresses based
            in Hendersonville, North Carolina. We&rsquo;ve been in the same
            showroom since {BUSINESS.foundedYear} and back our frames with a{" "}
            {BUSINESS.warrantyYears}-year warranty.
          </p>
          <p className="mt-6">
            <MagneticButton>
              <a
                href="#press-inquiries"
                className="inline-flex h-11 items-center justify-center rounded-md bg-cf-cta px-6 text-sm font-medium text-white shadow-sm transition-colors hover:bg-cf-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Press inquiries
              </a>
            </MagneticButton>
          </p>
          <p className="mt-3 text-sm text-cf-muted">
            Last updated {LAST_UPDATED}
          </p>
        </div>
      </section>

      <article className="mx-auto w-full max-w-[65ch] space-y-10 px-4 py-12 font-source-sans text-cf-ink sm:px-6 sm:py-16">
        <section className="space-y-4">
          <h2 className="font-playfair text-2xl font-semibold tracking-tight">
            About the company
          </h2>
          <p className="leading-relaxed">
            Founded in 1991, Carolina Futons sells convertible futon frames,
            futon mattresses, and bedroom furniture from a single showroom
            in Hendersonville, North Carolina. We focus on solid-wood
            construction, natural fibers, and pieces that are built to be
            repaired rather than replaced — most of our frames carry a
            15-year warranty.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-playfair text-2xl font-semibold tracking-tight">
            Story angles we can speak to
          </h2>
          <p className="leading-relaxed">
            Small-space and apartment furniture, the case for buying
            furniture you can repair, what changed (and what didn&rsquo;t)
            for an independent retailer over thirty years in the same town,
            and the practical differences between cotton, wool, and
            innerspring futon mattresses.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-playfair text-2xl font-semibold tracking-tight">
            Press contact
          </h2>
          <p className="leading-relaxed">
            For interviews, product photography, or fact-checking, email{" "}
            <a
              href={BUSINESS.emailHref}
              className="text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
            >
              {BUSINESS.email}
            </a>{" "}
            or call{" "}
            <a
              href={BUSINESS.phoneHref}
              className="text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
            >
              {BUSINESS.phone}
            </a>
            . Tell us your outlet, deadline, and what you&rsquo;re working
            on. We&rsquo;ll get back to you within one business day.
          </p>
          <p className="leading-relaxed">
            Showroom: {BUSINESS.street} Street, {BUSINESS.city},{" "}
            {BUSINESS.state} {BUSINESS.zip}.
          </p>
        </section>

        <section
          id="press-inquiries"
          aria-labelledby="press-inquiries-heading"
          className="space-y-4 scroll-mt-24"
        >
          <h2
            id="press-inquiries-heading"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            Send a press inquiry
          </h2>
          <p className="leading-relaxed">
            Use the form below for the fastest response. The subject is
            pre-filled with <strong>[Press]</strong> so the team can route
            it; please add your outlet and deadline.
          </p>
          <ContactForm subjectPrefix="[Press] " />
        </section>
      </article>
    </main>
  );
}
