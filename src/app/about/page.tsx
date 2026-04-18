import type { Metadata } from "next";
import Image from "next/image";

import { BUSINESS } from "@/lib/business/contact-info";

// Wix CDN photo reused from HERO_SLIDES on the home page — one source of
// brand imagery until /public/brand/ assets are delivered. See
// next.config.ts for the static.wixstatic.com remotePattern allowlist.
const ABOUT_HERO = {
  src: "https://static.wixstatic.com/media/e04e89_cf15142c61714ecfad7852522e0a98e4~mv2.jpg/v1/fit/w_2000,h_2000,q_90/file.jpg",
  alt: "Carolina Futons showroom in Hendersonville, NC — hardwood frames on display",
};

const TIMELINE_MILESTONES = [
  { year: "1991", description: "Founded in Hendersonville, NC." },
  { year: "2000", description: "Showroom expansion — more frames on the floor, more space to sit on them." },
  { year: "2010", description: "Online catalog launches so out-of-town customers can browse before they drive." },
  { year: "2024", description: "Web relaunch — new storefront, same family answering the phone." },
];

export const metadata: Metadata = {
  title: "About — Carolina Futons",
  description:
    "Family-owned since 1991, Carolina Futons has helped Hendersonville, NC customers find American-made frames and mattresses that last.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto w-full">
      <div className="relative aspect-video max-h-96 w-full overflow-hidden">
        <Image
          data-testid="about-hero-image"
          src={ABOUT_HERO.src}
          alt={ABOUT_HERO.alt}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </div>
      <article className="mx-auto max-w-[65ch] space-y-8 px-4 py-12 font-source-sans text-cf-ink sm:px-6 sm:py-16">
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

        <section
          data-testid="about-timeline"
          aria-label="Carolina Futons milestones"
          className="space-y-6"
        >
          <h2 className="font-playfair text-2xl font-semibold tracking-tight">
            Our milestones
          </h2>
          <ol className="space-y-5">
            {TIMELINE_MILESTONES.map(({ year, description }) => (
              <li
                key={year}
                className="flex flex-col gap-1 border-l-2 border-cf-cta/30 pl-4 sm:flex-row sm:items-baseline sm:gap-6"
              >
                <span
                  data-testid={`about-timeline-year-${year}`}
                  className="font-playfair text-2xl font-bold text-cf-cta sm:min-w-[5rem]"
                >
                  {year}
                </span>
                <span className="leading-relaxed">{description}</span>
              </li>
            ))}
          </ol>
        </section>

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
    </main>
  );
}
