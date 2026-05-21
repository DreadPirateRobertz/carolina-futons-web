import type { Metadata } from "next";
import Link from "next/link";

import { HeroReveal } from "@/components/motion/HeroReveal";
import { RoomPlannerCanvas } from "@/components/design-a-room/RoomPlannerCanvas";
import { RoomSceneViewer } from "@/components/design-a-room/RoomSceneViewer";
import { StargazingHero } from "@/components/mascot/StargazingHero";
import { BUSINESS } from "@/lib/business/contact-info";
import { DESIGN_STEPS } from "@/lib/design-a-room/steps";
import { DEFAULT_OG_IMAGE } from "@/lib/og";
import { twitterFromOpenGraph } from "@/lib/seo/twitter-from-og";
import { getSiteContent } from "@/lib/cms/site-content";

const DESIGN_A_ROOM_TITLE = "Design a Room — Carolina Futons";
const DESIGN_A_ROOM_DESCRIPTION =
  "Plan a room around a futon, Murphy bed, or daybed with Carolina Futons. Free consultation, fabric samples, and 35 years of local experience.";

const DESIGN_A_ROOM_OPEN_GRAPH = {
  title: DESIGN_A_ROOM_TITLE,
  description: DESIGN_A_ROOM_DESCRIPTION,
  url: "/design-a-room",
  type: "website" as const,
  images: [DEFAULT_OG_IMAGE],
};

export const metadata: Metadata = {
  title: DESIGN_A_ROOM_TITLE,
  description: DESIGN_A_ROOM_DESCRIPTION,
  alternates: { canonical: "/design-a-room" },
  openGraph: DESIGN_A_ROOM_OPEN_GRAPH,
  twitter: twitterFromOpenGraph(DESIGN_A_ROOM_OPEN_GRAPH),
};

const SHOWROOM_HOURS = "Wed–Sat, 10am–5pm";

// cfw-gpa: owner-editable Design-a-Room copy via SiteContent.
// DESIGN_STEPS (from @/lib/design-a-room/steps), BUSINESS contact details,
// and SHOWROOM_HOURS are excluded per §3 (structural / already-centralized).
const DAR_FALLBACKS = {
  introEyebrow: "Free consultation",
  introHeading: "Design a room around a futon",
  introBody:
    "Family-owned in Hendersonville since 1991. Stop by the showroom or give us a call — we’ll help you plan a room that sleeps guests, holds up to daily use, and still looks like a room, not a folded-out mattress.",
  sceneHeading: "See it in a room",
  sceneBody:
    "Explore how a futon frame, murphy bed, or platform bed looks inside a styled room. Switch styles to find a look that fits your space.",
  plannerHeading: "Check if it fits",
  plannerBody:
    "Enter your room dimensions and pick a futon or Murphy bed to see a rough top-down layout.",
  stepsHeading: "How it works",
  bookHeading: "Book a showroom visit",
  bookBody:
    "Ready to bring your measurements and see frames in person? Request a slot and we’ll confirm by email within one business day.",
  bookCtaLabel: "Request an appointment",
  otherWaysHeading: "Other ways to start",
} as const;

export default async function DesignARoomPage() {
  const [
    introEyebrow,
    introHeading,
    introBody,
    sceneHeading,
    sceneBody,
    plannerHeading,
    plannerBody,
    stepsHeading,
    bookHeading,
    bookBody,
    bookCtaLabel,
    otherWaysHeading,
  ] = await Promise.all([
    getSiteContent("design-a-room.intro.eyebrow", DAR_FALLBACKS.introEyebrow),
    getSiteContent("design-a-room.intro.heading", DAR_FALLBACKS.introHeading),
    getSiteContent("design-a-room.intro.body", DAR_FALLBACKS.introBody),
    getSiteContent("design-a-room.scene.heading", DAR_FALLBACKS.sceneHeading),
    getSiteContent("design-a-room.scene.body", DAR_FALLBACKS.sceneBody),
    getSiteContent("design-a-room.planner.heading", DAR_FALLBACKS.plannerHeading),
    getSiteContent("design-a-room.planner.body", DAR_FALLBACKS.plannerBody),
    getSiteContent("design-a-room.steps.heading", DAR_FALLBACKS.stepsHeading),
    getSiteContent("design-a-room.book.heading", DAR_FALLBACKS.bookHeading),
    getSiteContent("design-a-room.book.body", DAR_FALLBACKS.bookBody),
    getSiteContent("design-a-room.book.cta-label", DAR_FALLBACKS.bookCtaLabel),
    getSiteContent("design-a-room.other-ways.heading", DAR_FALLBACKS.otherWaysHeading),
  ]);

  return (
    <main className="w-full">
      <div className="max-h-72 w-full overflow-hidden">
        <StargazingHero />
      </div>
      <article className="mx-auto max-w-[65ch] space-y-24 px-4 py-12 font-source-sans text-cf-ink sm:px-6 sm:py-16">
        <HeroReveal>
          <header className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
              {introEyebrow}
            </p>
            <h1 className="font-playfair text-4xl font-semibold tracking-tight sm:text-5xl">
              {introHeading}
            </h1>
            <p className="text-lg leading-relaxed text-cf-muted">
              {introBody}
            </p>
          </header>
        </HeroReveal>

        <HeroReveal delay={0.08}>
          <section className="space-y-6" aria-labelledby="room-scene-heading">
            <h2
              id="room-scene-heading"
              className="font-playfair text-2xl font-semibold tracking-tight"
            >
              {sceneHeading}
            </h2>
            <p className="text-sm leading-relaxed text-cf-muted">
              {sceneBody}
            </p>
            <RoomSceneViewer />
          </section>
        </HeroReveal>

        <HeroReveal delay={0.1}>
          <section className="space-y-6" aria-labelledby="planner-heading">
            <h2
              id="planner-heading"
              className="font-playfair text-2xl font-semibold tracking-tight"
            >
              {plannerHeading}
            </h2>
            <p className="text-sm leading-relaxed text-cf-muted">
              {plannerBody}
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
              {stepsHeading}
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
                {bookHeading}
              </h2>
              <p className="leading-relaxed text-cf-muted">
                {bookBody}
              </p>
            </div>
            <Link
              href="/contact#appointment-form"
              className="inline-flex h-11 items-center justify-center rounded-md bg-cf-cta px-6 text-sm font-medium text-white shadow-sm transition-colors hover:bg-cf-cta/90"
            >
              {bookCtaLabel}
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

        <HeroReveal delay={0.2}>
          <section className="space-y-6" aria-labelledby="three-ways">
            <h2
              id="three-ways"
              className="font-playfair text-2xl font-semibold tracking-tight"
            >
              {otherWaysHeading}
            </h2>
            <ul className="grid gap-4 sm:grid-cols-3">
              <li className="flex flex-col gap-2 rounded-md border border-cf-ink/10 bg-white dark:bg-cf-cream dark:border-cf-ink/30 p-4">
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
              <li className="flex flex-col gap-2 rounded-md border border-cf-ink/10 bg-white dark:bg-cf-cream dark:border-cf-ink/30 p-4">
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
              <li className="flex flex-col gap-2 rounded-md border border-cf-ink/10 bg-white dark:bg-cf-cream dark:border-cf-ink/30 p-4">
                <h3 className="font-playfair text-base font-semibold tracking-tight">
                  Visit in person
                </h3>
                <address className="not-italic text-sm leading-relaxed">
                  {BUSINESS.street}, {BUSINESS.city}, {BUSINESS.state}{" "}
                  {BUSINESS.zip}
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
              </Link>{" "}
              or read the{" "}
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
