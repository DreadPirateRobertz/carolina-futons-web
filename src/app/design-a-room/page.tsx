import type { Metadata } from "next";
import Link from "next/link";

import { HeroReveal } from "@/components/motion/HeroReveal";
import { DesignARoomContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "Design a Room — Carolina Futons",
  description:
    "Work with the Carolina Futons team in Hendersonville, NC to plan a room around a futon, daybed, or Murphy bed. Free consultation, fabric samples, and 35 years of local experience.",
};

const SHOWROOM_ADDRESS = "824 Locust St, Hendersonville, NC 28792";
const SHOWROOM_PHONE_DISPLAY = "(828) 252-9449";
const SHOWROOM_PHONE_HREF = "tel:+18282529449";
const SHOWROOM_HOURS = "Wed–Sat, 10am–5pm";

const STEPS = [
  {
    title: "Tell us about the space",
    body: "Send a rough floor plan, a couple of photos, and how the room has to work day-to-day. A spare room that sleeps guests twice a year has very different priorities than a primary sitting room.",
  },
  {
    title: "Pick a frame and fabric",
    body: "We mail real fabric swatches and walk you through frame options — solid hardwood, metal, or a low platform — that fit the size and the traffic pattern. Our frames carry a 15-year warranty.",
  },
  {
    title: "See it before you buy",
    body: "We mock the layout in a simple plan view so you can confirm clearances, doorways, and how the mattress folds out before anything ships from our Hendersonville showroom.",
  },
];

export default function DesignARoomPage() {
  return (
    <main className="mx-auto w-full px-4 py-12 sm:px-6 sm:py-16">
      <article className="mx-auto max-w-[65ch] space-y-24 font-source-sans text-cf-ink">
        <HeroReveal>
          <header className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
              Free consultation
            </p>
            <h1 className="font-playfair text-4xl font-semibold tracking-tight sm:text-5xl">
              Design a room around a futon
            </h1>
            <p className="text-lg leading-relaxed text-cf-muted">
              Family-owned in Hendersonville since 1991. Bring us a sketch or a
              photo and we&rsquo;ll help you plan a room that sleeps guests,
              holds up to daily use, and still looks like a room — not a
              folded-out mattress.
            </p>
          </header>
        </HeroReveal>

        <HeroReveal delay={0.08}>
          <section className="space-y-6">
            <h2 className="font-playfair text-2xl font-semibold tracking-tight">
              How it works
            </h2>
            <ol className="space-y-6">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cf-cta/10 font-playfair text-sm font-semibold text-cf-cta"
                  >
                    {index + 1}
                  </span>
                  <div className="space-y-1">
                    <h3 className="font-playfair text-lg font-semibold tracking-tight">
                      {step.title}
                    </h3>
                    <p className="leading-relaxed">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </HeroReveal>

        <HeroReveal delay={0.16}>
          <section className="space-y-6 rounded-lg border border-cf-ink/10 bg-cf-cta/5 p-6 sm:p-8">
            <div className="space-y-2">
              <h2 className="font-playfair text-2xl font-semibold tracking-tight">
                Start a consultation
              </h2>
              <p className="leading-relaxed">
                Tell us about the space and a sales associate will get back
                within one business day. Prefer email or phone? Reach us at{" "}
                <a
                  href="mailto:hello@carolinafutons.com"
                  className="text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
                >
                  hello@carolinafutons.com
                </a>{" "}
                or{" "}
                <a
                  href={SHOWROOM_PHONE_HREF}
                  className="text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
                >
                  {SHOWROOM_PHONE_DISPLAY}
                </a>
                .
              </p>
            </div>
            <DesignARoomContactForm />
          </section>
        </HeroReveal>

        <HeroReveal delay={0.24}>
          <section className="space-y-3 border-t border-cf-ink/10 pt-10">
            <h2 className="font-playfair text-2xl font-semibold tracking-tight">
              Visit the showroom
            </h2>
            <address className="not-italic leading-relaxed">
              {SHOWROOM_ADDRESS}
              <br />
              {SHOWROOM_HOURS}
              <br />
              <a
                href={SHOWROOM_PHONE_HREF}
                className="text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
              >
                {SHOWROOM_PHONE_DISPLAY}
              </a>
            </address>
            <p className="leading-relaxed">
              Browsing frames first? Start with our{" "}
              <Link
                href="/shop"
                className="text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
              >
                full catalog
              </Link>{" "}
              or read the{" "}
              <Link
                href="/guides"
                className="text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
              >
                buying guides
              </Link>
              .
            </p>
          </section>
        </HeroReveal>
      </article>
    </main>
  );
}
