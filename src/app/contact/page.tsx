import type { Metadata } from "next";
import { Mail, Phone } from "lucide-react";

import { AppointmentForm } from "@/components/contact/AppointmentForm";
import { ContactForm } from "@/components/contact/ContactForm";
import { FogScene } from "@/components/mascot/FogScene";
import { BUSINESS } from "@/lib/business/contact-info";
import { DEFAULT_OG_IMAGE } from "@/lib/og";

const TITLE = "Contact — Carolina Futons";
const DESCRIPTION =
  "Reach the Carolina Futons team with questions about frames, mattresses, delivery, or warranty. Family-owned in Hendersonville, NC since 1991.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/contact" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function ContactPage() {
  return (
    <main className="w-full">
      <FogScene />
      <div className="mx-auto w-full px-4 py-12 sm:px-6 sm:py-16">
        <article className="mx-auto max-w-[65ch] space-y-10 font-source-sans text-cf-ink dark:text-cf-cream">
        <header className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
            Contact
          </p>
          <h1 className="font-playfair text-4xl font-semibold tracking-tight sm:text-5xl">
            We’d love to hear from you.
          </h1>
          <p className="text-lg leading-relaxed text-cf-muted">
            Questions about a frame, a mattress, delivery, or a past order?
            Drop us a note and a human will reply within one business day.
          </p>
        </header>

        <section aria-labelledby="contact-direct" className="space-y-4">
          <h2
            id="contact-direct"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            Reach us directly
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
                {BUSINESS.street}, {BUSINESS.city}, {BUSINESS.state} {BUSINESS.zip}
              </dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="appointment-form" className="space-y-4">
          <h2
            id="appointment-form"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            Schedule a showroom visit
          </h2>
          <p className="text-sm leading-relaxed text-cf-muted">
            Open Wednesday through Saturday, 10&nbsp;am–5&nbsp;pm. Request a
            slot and we&apos;ll confirm by email within one business day.
          </p>
          <AppointmentForm />
        </section>

        <section aria-labelledby="contact-form" className="space-y-4">
          <h2
            id="contact-form"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            Send a message
          </h2>
          <ContactForm />
        </section>
        </article>
      </div>
    </main>
  );
}
