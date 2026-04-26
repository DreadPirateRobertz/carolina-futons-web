import type { Metadata } from "next";

import { MountainSkyline } from "@/components/illustrations/MountainSkyline";
import {
  ShopTheRoom,
  ABOUT_HERO_PHOTO,
  ABOUT_HOTSPOT_CONFIGS,
} from "@/components/site/ShopTheRoom";
import { ScrollStory } from "@/components/about/ScrollStory";
import { BUSINESS } from "@/lib/business/contact-info";

export const metadata: Metadata = {
  title: "About — Carolina Futons",
  description:
    "Family-owned since 1991, Carolina Futons has helped Hendersonville, NC customers find American-made frames and mattresses that last.",
};

export default async function AboutPage() {
  return (
    <main className="w-full">
      {/* cf-93rb A.2: full-bleed Blue Ridge skyline above the page header
          to anchor the brand sense of place before the prose begins. */}
      <MountainSkyline />
      <div className="mx-auto w-full px-4 py-12 sm:px-6 sm:py-16">
        <article className="mx-auto max-w-[65ch] space-y-8 font-source-sans text-cf-ink">
          <header className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
            Our story
          </p>
          <h1 className="font-playfair text-4xl font-semibold tracking-tight sm:text-5xl">
            About Carolina Futons
          </h1>
          <p className="text-lg leading-relaxed text-cf-muted">
            Family-owned and independently operated in Hendersonville,
            North Carolina since {BUSINESS.foundedYear}.
          </p>
        </header>

        <p className="text-lg leading-relaxed">
          Carolina Futons opened its doors in {BUSINESS.foundedYear} with
          a simple idea: sell furniture that is built to last, made by
          people who take the work seriously, and stand behind it
          personally. Three decades later, that is still the job.
        </p>

        <section className="space-y-4">
          <h2 className="font-playfair text-2xl font-semibold tracking-tight">
            What we believe
          </h2>
          <p className="leading-relaxed">
            Furniture should be durable, repairable, and honest about what
            it is. We favor solid hardwood frames and mattresses made in
            the United States, we tell you where each piece comes from,
            and we price our catalog so you can compare without
            decoding a sale.
          </p>
          <p className="leading-relaxed">
            A futon is a bed that also earns its keep as a sofa, so the
            decision should feel as considered as any other major
            purchase. We’d rather help one customer choose the right
            frame than ship two of the wrong one.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-playfair text-2xl font-semibold tracking-tight">
            Where to find us
          </h2>
          <p className="leading-relaxed">
            Our showroom is at {BUSINESS.street}, {BUSINESS.city},{" "}
            {BUSINESS.state} {BUSINESS.zip}. Stop in to sit on the
            frames, feel the mattresses, and meet the people who will
            answer the phone if anything ever goes sideways.
          </p>
          <p className="leading-relaxed">
            Prefer to talk first? Call{" "}
            <a
              href={BUSINESS.phoneHref}
              className="text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
            >
              {BUSINESS.phone}
            </a>{" "}
            or email{" "}
            <a
              href={BUSINESS.emailHref}
              className="text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
            >
              {BUSINESS.email}
            </a>
            .
          </p>
        </section>

        <ScrollStory />

        <section className="space-y-4">
          <h2 className="font-playfair text-2xl font-semibold tracking-tight">
            The team
          </h2>
          <p className="leading-relaxed">
            A short roster of the people who build, deliver, and stand
            behind every order is coming soon. In the meantime, the
            fastest way to reach any of us is the contact details above
            — we answer our own email.
          </p>
        </section>
        </article>
      </div>

      {/* cf-delight Phase 3: shop-the-room hotspots over a coastal-bedroom
          platform-bed photo, anchoring the brand-history prose with a
          tangible "this is what we make" moment before the user leaves. */}
      <ShopTheRoom
        headingId="about-shop-the-room-heading"
        eyebrow="See it in a real bedroom"
        heading="The pieces in this story"
        heroPhoto={ABOUT_HERO_PHOTO}
        hotspotConfigs={ABOUT_HOTSPOT_CONFIGS}
      />
    </main>
  );
}
