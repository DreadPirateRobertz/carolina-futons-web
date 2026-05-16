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

// cf-bbu5 (cf-7pk0.F2): owner-editable headings + intro/body copy.
// Mirrors the cfw-22e /visit pattern — fallback strings below match
// the current published copy verbatim so a Wix-down / unprovisioned
// render is byte-identical.
const CONTACT_COPY_FALLBACKS = {
  eyebrow: "Contact",
  introHeading: "We’d love to hear from you.",
  introBody:
    "Questions about a frame, a mattress, delivery, or a past order? Drop us a note and a human will reply within one business day.",
  reachHeading: "Reach us directly",
  appointmentHeading: "Schedule a showroom visit",
  appointmentBodySuffix:
    "Request a slot and we’ll confirm by email within one business day.",
  messageHeading: "Send a message",
} as const;

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

export default async function ContactPage() {
  // cf-7pk0 F2: read the canonical showroom hours from SiteContent so
  // this page can't drift from /visit. Pre-fix, line 97 hardcoded
  // "Wednesday through Saturday, 10 am–5 pm" while /visit's published
  // schedule said wed-sat is Closed — sending customers to a closed
  // showroom. Single source of truth now.
  //
  // cf-bbu5: + owner-editable headings / intro / section labels so
  // Brenda can refresh marketing copy without a deploy.
  const [
    showroomScheduleLine,
    eyebrow,
    introHeading,
    introBody,
    reachHeading,
    appointmentHeading,
    appointmentBodySuffix,
    messageHeading,
  ] = await Promise.all([
    getShowroomScheduleLine(),
    getSiteContent("contact.eyebrow", CONTACT_COPY_FALLBACKS.eyebrow),
    getSiteContent(
      "contact.intro.heading",
      CONTACT_COPY_FALLBACKS.introHeading,
    ),
    getSiteContent("contact.intro.body", CONTACT_COPY_FALLBACKS.introBody),
    getSiteContent(
      "contact.reach.heading",
      CONTACT_COPY_FALLBACKS.reachHeading,
    ),
    getSiteContent(
      "contact.appointment.heading",
      CONTACT_COPY_FALLBACKS.appointmentHeading,
    ),
    getSiteContent(
      "contact.appointment.body-suffix",
      CONTACT_COPY_FALLBACKS.appointmentBodySuffix,
    ),
    getSiteContent(
      "contact.message.heading",
      CONTACT_COPY_FALLBACKS.messageHeading,
    ),
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
              {reachHeading}
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
              {showroomScheduleLine} {appointmentBodySuffix}
            </p>
            <AppointmentForm />
          </section>

          <section aria-labelledby="contact-form" className="space-y-4">
            <h2
              id="contact-form"
              className="font-playfair text-2xl font-semibold tracking-tight"
            >
              {messageHeading}
            </h2>
            <ContactForm />
          </section>
        </article>
      </div>
    </main>
  );
}
