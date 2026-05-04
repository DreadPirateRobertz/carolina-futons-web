import type { Metadata } from "next";
import Link from "next/link";

import { HeroReveal } from "@/components/motion/HeroReveal";
import { RoomPlannerCanvas } from "@/components/design-a-room/RoomPlannerCanvas";
import { RoomSceneViewer } from "@/components/design-a-room/RoomSceneViewer";
import { BotanicalDesignARoom } from "@/components/illustrations/BotanicalDesignARoom";
import { BUSINESS } from "@/lib/business/contact-info";
import { DESIGN_STEPS } from "@/lib/design-a-room/steps";

export const metadata: Metadata = {
  title: "Design a Room — Carolina Futons",
  description:
    "Work with the Carolina Futons team in Hendersonville, NC to plan a room around a futon, daybed, or Murphy bed. Free consultation, fabric samples, and 35 years of local experience.",
};

const SHOWROOM_HOURS = "Wed–Sat, 10am–5pm";

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
          <section className="space-y-6" aria-labelledby="room-scene-heading">
            <h2
              id="room-scene-heading"
              className="font-playfair text-2xl font-semibold tracking-tight"
            >
              See it in a room
            </h2>
            <p className="text-sm leading-relaxed text-cf-muted">
              Explore how a futon frame, murphy bed, or platform bed looks inside
              a styled room. Switch styles to find a look that fits your space.
            </p>
            <RoomSceneViewer />
          </section>
        </HeroReveal>

        <HeroReveal delay={0.10}>
          <section className="space-y-6" aria-labelledby="planner-heading">
            <h2
              id="planner-heading"
              className="font-playfair text-2xl font-semibold tracking-tight"
            >
              Check if it fits
            </h2>
            <p className="text-sm leading-relaxed text-cf-muted">
              Enter your room dimensions and pick a futon or Murphy bed to see
              a rough top-down layout.
            </p>
            <RoomPlannerCanvas />
          </section>
        </HeroReveal>

        <HeroReveal delay={0.12}>
          <section className="space-y-6" aria-labelledby="how-it-works">
            <h2
              id="how-it-works"
              className="font-playfair text-2xl font-semibold tracking-tight"
            >
              How it works
            </h2>
            <ol className="space-y-6">
              {DESIGN_STEPS.map((step, index) => (
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
          <section
            className="space-y-4 rounded-lg border border-cf-ink/10 bg-cf-cta/5 p-6 sm:p-8"
            aria-labelledby="book-visit"
          >
            <div className="space-y-2">
              <h2
                id="book-visit"
                className="font-playfair text-2xl font-semibold tracking-tight"
              >
                Book a showroom visit
              </h2>
              <p className="leading-relaxed text-cf-muted">
                Ready to bring your measurements and see frames in person?
                Request a slot and we&apos;ll confirm by email within one
                business day.
              </p>
            </div>
            <Link
              href="/contact#appointment-form"
              className="inline-flex h-11 items-center justify-center rounded-md bg-cf-cta px-6 text-sm font-medium text-white shadow-sm transition-colors hover:bg-cf-cta/90"
            >
              Request an appointment
            </Link>
            <p className="text-xs text-cf-muted">
              Open {SHOWROOM_HOURS}. Or call{" "}
              <a
                href={BUSINESS.phoneHref}
                className="text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
              >
                {BUSINESS.phone}
              </a>{" "}
              to speak with someone today.
            </p>
          </section>
        </HeroReveal>

        <HeroReveal delay={0.20}>
          <section className="space-y-6" aria-labelledby="three-ways">
            <h2
              id="three-ways"
              className="font-playfair text-2xl font-semibold tracking-tight"
            >
              Other ways to start
            </h2>
            <ul className="grid gap-4 sm:grid-cols-3">
              <li className="flex flex-col gap-2 rounded-md border border-cf-ink/10 bg-white p-4 dark:bg-cf-cream">
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
              <li className="flex flex-col gap-2 rounded-md border border-cf-ink/10 bg-white p-4 dark:bg-cf-cream">
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
              <li className="flex flex-col gap-2 rounded-md border border-cf-ink/10 bg-white p-4 dark:bg-cf-cream">
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
