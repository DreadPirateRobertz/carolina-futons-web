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
import { getSiteContent } from "@/lib/cms/site-content";
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

// cf-7pk0 F1: owner-editable About copy via SiteContent. Mirrors the
// cfw-22e pattern on /visit (per-section keys with documented fallbacks).
// 11 keys total — location.body-2 stays inline-JSX because it embeds
// <a> links around BUSINESS.phone/email; SiteContent values are plain
// strings and can’t wrap JSX. Brenda edits any of these via Wix Editor
// without a deploy.
const ABOUT_COPY_FALLBACKS = {
  introEyebrow: "Our story",
  introHeading: "About Carolina Futons",
  introSubheading:
    "Family-owned and independently operated in Hendersonville, North Carolina since 1991.",
  introLede:
    "Carolina Futons opened its doors in 1991 with a simple idea: sell furniture that is built to last, made by people who take the work seriously, and stand behind it personally. Three decades later, that is still the job.",
  beliefsHeading: "What we believe",
  beliefsBody1:
    "Furniture should be durable, repairable, and honest about what it is. We favor solid hardwood frames and mattresses made in the United States, we tell you where each piece comes from, and we price our catalog so you can compare without decoding a sale.",
  beliefsBody2:
    "A futon is a bed that also earns its keep as a sofa, so the decision should feel as considered as any other major purchase. We’d rather help one customer choose the right frame than ship two of the wrong one.",
  locationHeading: "Where to find us",
  locationBody1: `Our showroom is at ${BUSINESS.street}, ${BUSINESS.city}, ${BUSINESS.state} ${BUSINESS.zip}. Stop in to sit on the frames, feel the mattresses, and meet the people who will answer the phone if anything ever goes sideways.`,
  teamHeading: "The team",
  teamBody:
    "A short roster of the people who build, deliver, and stand behind every order is coming soon. In the meantime, the fastest way to reach any of us is the contact details above — we answer our own email.",
} as const;

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

  const [
    introEyebrow,
    introHeading,
    introSubheading,
    introLede,
    beliefsHeading,
    beliefsBody1,
    beliefsBody2,
    locationHeading,
    locationBody1,
    teamHeading,
    teamBody,
  ] = await Promise.all([
    getSiteContent("about.intro.eyebrow", ABOUT_COPY_FALLBACKS.introEyebrow),
    getSiteContent("about.intro.heading", ABOUT_COPY_FALLBACKS.introHeading),
    getSiteContent("about.intro.subheading", ABOUT_COPY_FALLBACKS.introSubheading),
    getSiteContent("about.intro.lede", ABOUT_COPY_FALLBACKS.introLede),
    getSiteContent("about.beliefs.heading", ABOUT_COPY_FALLBACKS.beliefsHeading),
    getSiteContent("about.beliefs.body-1", ABOUT_COPY_FALLBACKS.beliefsBody1),
    getSiteContent("about.beliefs.body-2", ABOUT_COPY_FALLBACKS.beliefsBody2),
    getSiteContent("about.location.heading", ABOUT_COPY_FALLBACKS.locationHeading),
    getSiteContent("about.location.body-1", ABOUT_COPY_FALLBACKS.locationBody1),
    getSiteContent("about.team.heading", ABOUT_COPY_FALLBACKS.teamHeading),
    getSiteContent("about.team.body", ABOUT_COPY_FALLBACKS.teamBody),
  ]);
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
              {introEyebrow}
            </p>
            <h1 className="font-playfair text-4xl font-semibold tracking-tight sm:text-5xl">
              {introHeading}
            </h1>
            <p className="text-lg leading-relaxed text-cf-muted">
              {introSubheading}
            </p>
          </header>

          <p className="text-lg leading-relaxed">{introLede}</p>

          <section className="space-y-4">
            <h2 className="font-playfair text-2xl font-semibold tracking-tight">
              {beliefsHeading}
            </h2>
            <p className="leading-relaxed">{beliefsBody1}</p>
            <p className="leading-relaxed">{beliefsBody2}</p>
          </section>

          <section className="space-y-4">
            <h2 className="font-playfair text-2xl font-semibold tracking-tight">
              {locationHeading}
            </h2>
            <p className="leading-relaxed">{locationBody1}</p>
            {/* cf-7pk0 F1: location.body-2 stays inline-JSX because it embeds
                <a> links around BUSINESS.phone/email — SiteContent values are
                plain strings and can't wrap React children. If marketing wants
                to A/B test this copy, the bead spec is to split into prefix /
                middle / suffix SiteContent keys; flag a follow-on bead when
                that need lands. */}
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
              {teamHeading}
            </h2>
            <p className="leading-relaxed">{teamBody}</p>
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
