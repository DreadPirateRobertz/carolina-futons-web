import type { Metadata } from "next";
import { Mail, Phone } from "lucide-react";

import { AppointmentForm } from "@/components/contact/AppointmentForm";
import { ContactForm } from "@/components/contact/ContactForm";
import { FogScene } from "@/components/mascot/FogScene";
import { BUSINESS } from "@/lib/business/contact-info";
import { getShowroomScheduleLine } from "@/lib/business/showroom-hours";
import { getSiteContent } from "@/lib/cms/site-content";
import { DEFAULT_OG_IMAGE } from "@/lib/og";
import { twitterFromOpenGraph } from "@/lib/seo/twitter-from-og";

const TITLE = "Contact — Carolina Futons";
const DESCRIPTION =
  "Reach the Carolina Futons team with questions about frames, mattresses, delivery, or warranty. Family-owned in Hendersonville, NC since 1991.";

const OG = {
  title: TITLE,
  description: DESCRIPTION,
  images: [DEFAULT_OG_IMAGE],
};

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/contact" },
  openGraph: OG,
  // cf-2qxr: per-page twitter card mirror.
  twitter: twitterFromOpenGraph(OG),
};

// cf-bbu5: SiteContent fallbacks for /contact. Every heading + section
// label is owner-editable via the Wix SiteContent collection. Fallbacks
// below match the pre-cf-bbu5 hardcoded copy verbatim so a Wix-down /
// unprovisioned render is byte-identical to today.
//
// Hours are NOT mirrored here — they're fetched via getShowroomScheduleLine
// from the SAME SiteContent keys (`visit.hours.sun-tue` / `visit.hours.wed-sat`)
// that /visit reads. Single-source-of-truth invariant pinned by the
// drift test in `contact-page.test.tsx`.
const CONTACT_COPY_FALLBACKS = {
  eyebrow: "Contact",
  introHeading: "We’d love to hear from you.",
  introBody:
    "Questions about a frame, a mattress, delivery, or a past order? Drop us a note and a human will reply within one business day.",
  directHeading: "Reach us directly",
  appointmentHeading: "Schedule a showroom visit",
  appointmentBodySuffix:
    " Request a slot and we’ll confirm by email within one business day.",
  formHeading: "Send a message",
};

export default async function ContactPage() {
  // cf-7pk0 F2 (resolved earlier): showroom hours from SiteContent via
  // the same keys /visit reads — drift-proof.
  // cf-bbu5: also wire headings + section labels to SiteContent so they
  // can change without a deploy.
  const [
    showroomScheduleLine,
    eyebrow,
    introHeading,
    introBody,
    directHeading,
    appointmentHeading,
    appointmentBodySuffix,
    formHeading,
  ] = await Promise.all([
    getShowroomScheduleLine(),
    getSiteContent("contact.eyebrow", CONTACT_COPY_FALLBACKS.eyebrow),
    getSiteContent(
      "contact.intro.heading",
      CONTACT_COPY_FALLBACKS.introHeading,
    ),
    getSiteContent("contact.intro.body", CONTACT_COPY_FALLBACKS.introBody),
    getSiteContent(
      "contact.direct.heading",
      CONTACT_COPY_FALLBACKS.directHeading,
    ),
    getSiteContent(
      "contact.appointment.heading",
      CONTACT_COPY_FALLBACKS.appointmentHeading,
    ),
    getSiteContent(
      "contact.appointment.body-suffix",
      CONTACT_COPY_FALLBACKS.appointmentBodySuffix,
    ),
    getSiteContent("contact.form.heading", CONTACT_COPY_FALLBACKS.formHeading),
  ]);

  return (
    <main className="w-full">
      <FogScene />
      <div className="mx-auto w-full px-4 py-12 sm:px-6 sm:py-16">
        <article className="mx-auto max-w-[65ch] space-y-10 font-source-sans text-cf-ink">
          <header className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
              {eyebrow}
            </p>
            <h1 className="font-playfair text-4xl font-semibold tracking-tight sm:text-5xl">
              {introHeading}
            </h1>
            <p className="text-lg leading-relaxed text-cf-muted">
              {introBody}
            </p>
          </header>

          <section aria-labelledby="contact-direct" className="space-y-4">
            <h2
              id="contact-direct"
              className="font-playfair text-2xl font-semibold tracking-tight"
            >
              {directHeading}
            </h2>
            <dl className="space-y-2 text-base leading-relaxed">
              {/* cfw-eqk: tap-to-call/tap-to-email — Lucide Phone/Mail icons
                next to the existing tel:/mailto: links. Icons are
                aria-hidden; the accessible link name stays the raw
                phone/email string. */}
              <div className="flex gap-2">
                <dt className="font-medium">Phone</dt>
                <dd>
                  <a
                    href={BUSINESS.phoneHref}
                    className="inline-flex items-center gap-2 text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
                  >
                    <Phone aria-hidden="true" className="h-4 w-4 shrink-0" />
                    <span>{BUSINESS.phone}</span>
                  </a>
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-medium">Email</dt>
                <dd>
                  <a
                    href={BUSINESS.emailHref}
                    className="inline-flex items-center gap-2 text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
                  >
                    <Mail aria-hidden="true" className="h-4 w-4 shrink-0" />
                    <span>{BUSINESS.email}</span>
                  </a>
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-medium">Visit</dt>
                <dd>
                  {BUSINESS.street}, {BUSINESS.city}, {BUSINESS.state}{" "}
                  {BUSINESS.zip}
                </dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="appointment-form" className="space-y-4">
            <h2
              id="appointment-form"
              className="font-playfair text-2xl font-semibold tracking-tight"
            >
              {appointmentHeading}
            </h2>
            <p className="text-sm leading-relaxed text-cf-muted">
              {showroomScheduleLine}
              {appointmentBodySuffix}
            </p>
            <AppointmentForm />
          </section>

          <section aria-labelledby="contact-form" className="space-y-4">
            <h2
              id="contact-form"
              className="font-playfair text-2xl font-semibold tracking-tight"
            >
              {formHeading}
            </h2>
            <ContactForm />
          </section>
        </article>
      </div>
    </main>
  );
}
