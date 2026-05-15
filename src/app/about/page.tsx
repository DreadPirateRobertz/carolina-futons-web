import type { Metadata } from "next";

import { MascotWorldHero } from "@/components/mascot/MascotWorldHero";
import { MascotTimeline } from "@/components/mascot/MascotTimeline";
import { Bear, Deer, Fox, Owl } from "@/components/mascot/MascotCharacters";
import {
  ShopTheRoom,
  ABOUT_HERO_PHOTO,
  ABOUT_HOTSPOT_CONFIGS,
} from "@/components/site/ShopTheRoom";
import { BUSINESS } from "@/lib/business/contact-info";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildAboutPageSchema, resolveSiteUrl } from "@/lib/seo/json-ld";
import { DEFAULT_OG_IMAGE } from "@/lib/og";
import { twitterFromOpenGraph } from "@/lib/seo/twitter-from-og";

const ABOUT_DESCRIPTION =
  "Family-owned since 1991, Carolina Futons has helped Hendersonville, NC customers find American-made frames and mattresses that last.";

const OG = {
  title: "About — Carolina Futons",
  description: ABOUT_DESCRIPTION,
  images: [DEFAULT_OG_IMAGE],
};

export const metadata: Metadata = {
  title: "About — Carolina Futons",
  description: ABOUT_DESCRIPTION,
  alternates: { canonical: "/about" },
  openGraph: OG,
  // cf-e55k: per-page twitter card.
  twitter: twitterFromOpenGraph(OG),
};

export default async function AboutPage() {
  const siteUrl = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  const aboutSchema = buildAboutPageSchema({
    name: "About Carolina Futons",
    description: ABOUT_DESCRIPTION,
    canonicalUrl: `${siteUrl}/about`,
    siteUrl,
  });
  return (
    <main className="w-full">
      <JsonLd id="jsonld-about" schema={aboutSchema} />
      {/* v3 mascot porch scene — bear on Blue Ridge */}
      <div data-slot="about-illustration" className="w-full" style={{ height: "clamp(300px, 42vw, 640px)" }}>
        <MascotWorldHero />
      </div>
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
              purchase. We&apos;d rather help one customer choose the right
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
            {/* v3: character ensemble — bear, owl, fox, deer replacing TeamPortrait */}
            <div
              data-slot="character-ensemble"
              className="flex items-end justify-center gap-8 py-6"
              aria-hidden="true"
            >
              <svg viewBox="-60 -80 120 100" width="80" height="100">
                <Bear pose="sitting" scale={0.7} />
              </svg>
              <svg viewBox="-24 -36 48 48" width="60" height="72">
                <Owl scale={0.65} />
              </svg>
              <svg viewBox="-55 -28 110 38" width="90" height="55">
                <Fox scale={0.75} />
              </svg>
              <svg viewBox="-24 -50 80 60" width="80" height="75">
                <Deer scale={0.65} />
              </svg>
            </div>
          </section>
        </article>
      </div>

      {/* v3: mascot character vignettes timeline (1991 → 2026) */}
      <div className="w-full" style={{ height: "clamp(180px, 28vw, 500px)" }}>
        <MascotTimeline />
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
