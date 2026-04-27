import type { Metadata } from "next";
import Link from "next/link";

import { HeroReveal } from "@/components/motion/HeroReveal";
import { BUSINESS } from "@/lib/business/contact-info";
import { BotanicalDesignARoom } from "@/components/illustrations/BotanicalDesignARoom";

export const metadata: Metadata = {
  title: "Design a Room — Carolina Futons",
  description:
    "Work with the Carolina Futons team in Hendersonville, NC to plan a room around a futon, daybed, or Murphy bed. Free consultation, fabric samples, and 35 years of local experience.",
};

const SHOWROOM_HOURS = "Wed–Sat, 10am–5pm";

const STEPS = [
  {
    title: "Tell us about the space",
    body: "Bring a rough floor plan, a couple of photos, and how the room has to work day-to-day. A spare room that sleeps guests twice a year has very different priorities than a primary sitting room.",
  },
  {
    title: "Pick a frame and fabric",
    body: "We walk you through real fabric swatches and frame options — solid hardwood, metal, or a low platform — that fit the size and the traffic pattern. Our frames carry a 15-year warranty.",
  },
  {
    title: "See it before you buy",
    body: "We mock the layout in a simple plan view so you can confirm clearances, doorways, and how the mattress folds out before anything leaves the Hendersonville showroom.",
  },
];

export default function DesignARoomPage() {
  return (
    <main className="w-full">
      {/* cf-pgec: v2 Botanical room-scene header illustration */}
      <BotanicalDesignARoom className="max-h-72" />
      <article className="mx-auto max-w-[65ch] space-y-24 px-4 py-12 font-source-sans text-cf-ink sm:px-6 sm:py-16">
        <HeroReveal>
          <header className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
              Free consultation
            </p>
            <h1 className="font-playfair text-4xl font-semibold tracking-tight sm:text-5xl">
              Design a room around a futon
            </h1>
            <p className="text-lg leading-relaxed text-cf-muted">
              Family-owned in Hendersonville since 1991. Stop by the showroom
              or give us a call — we&rsquo;ll help you plan a room that sleeps
              guests, holds up to daily use, and still looks like a room, not
              a folded-out mattress.
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
                Three ways to start
              </h2>
              <p className="leading-relaxed text-cf-muted">
                The design consultation is hands-on. Pick whichever path fits
                your week.
              </p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-3">
              <li className="flex flex-col gap-2 rounded-md border border-cf-ink/10 bg-white p-4">
                <h3 className="font-playfair text-base font-semibold tracking-tight">
                  Call the showroom
                </h3>
                <a
                  href={BUSINESS.phoneHref}
                  className="text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
                >
                  {BUSINESS.phone}
                </a>
                <p className="text-sm leading-relaxed text-cf-muted">
                  Fastest way to get on a sales associate&rsquo;s calendar.
                </p>
              </li>
              <li className="flex flex-col gap-2 rounded-md border border-cf-ink/10 bg-white p-4">
                <h3 className="font-playfair text-base font-semibold tracking-tight">
                  Email a sketch
                </h3>
                <a
                  href={BUSINESS.emailHref}
                  className="break-all text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
                >
                  {BUSINESS.email}
                </a>
                <p className="text-sm leading-relaxed text-cf-muted">
                  Send photos, dimensions, and what the room needs to do.
                </p>
              </li>
              <li className="flex flex-col gap-2 rounded-md border border-cf-ink/10 bg-white p-4">
                <h3 className="font-playfair text-base font-semibold tracking-tight">
                  Visit in person
                </h3>
                <address className="not-italic text-sm leading-relaxed">
                  {BUSINESS.street}, {BUSINESS.city}, {BUSINESS.state} {BUSINESS.zip}
                  <br />
                  {SHOWROOM_HOURS}
                </address>
              </li>
            </ul>
          </section>
        </HeroReveal>

        <HeroReveal delay={0.24}>
          <section className="space-y-3 border-t border-cf-ink/10 pt-10">
            <h2 className="font-playfair text-2xl font-semibold tracking-tight">
              Want to browse first?
            </h2>
            <p className="leading-relaxed">
              Start with the{" "}
              <Link
                href="/shop"
                className="text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
              >
                full catalog
              </Link>
              {" "}or read the{" "}
              <Link
                href="/guides"
                className="text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
              >
                buying guides
              </Link>
              . When you&rsquo;re ready, call{" "}
              <a
                href={BUSINESS.phoneHref}
                className="text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
              >
                {BUSINESS.phone}
              </a>{" "}
              or email{" "}
              <a
                href={BUSINESS.emailHref}
                className="break-all text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
              >
                {BUSINESS.email}
              </a>
              .
            </p>
          </section>
        </HeroReveal>
      </article>
    </main>
  );
}
