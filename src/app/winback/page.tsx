import type { Metadata } from "next";
import Link from "next/link";
import { CtaButton } from "@/components/ui/cta-button";

import { NewsletterSignup } from "@/components/site/NewsletterSignup";
import { trackCustomEvent } from "@/lib/wix/custom-events";

export const metadata: Metadata = {
  title: "We miss you — come back to Carolina Futons",
  description:
    "A note from Hendersonville: new arrivals, fresh fabrics, and a thank-you offer for our long-time customers. Welcome back.",
  robots: { index: false, follow: true },
  openGraph: {
    title: "We miss you — Carolina Futons",
    description:
      "American-made comfort from Hendersonville, NC. Come see what's new.",
  },
};

export const dynamic = "force-dynamic";

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

type UtmPayload = Partial<Record<(typeof UTM_KEYS)[number], string>>;

function pickUtmParams(
  raw: Record<string, string | string[] | undefined>,
): UtmPayload {
  const out: UtmPayload = {};
  for (const key of UTM_KEYS) {
    const v = raw[key];
    if (typeof v === "string" && v.length > 0) out[key] = v;
  }
  return out;
}

export default async function WinbackPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const utm = pickUtmParams(searchParams);

  // Awaited so the event is logged within the request lifetime; errors are
  // swallowed inside trackCustomEvent and never surface to the caller.
  await trackCustomEvent("winback_landing_view", {
    source: "winback",
    ...utm,
  });

  return (
    <main className="w-full">
      <section
        aria-labelledby="winback-hero"
        className="relative overflow-hidden bg-cf-cream"
      >
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center md:py-24 lg:px-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-cf-cta">
              A note from Hendersonville
            </p>
            <h1
              id="winback-hero"
              className="mt-4 font-heading text-4xl font-bold uppercase leading-[1.05] tracking-tight text-cf-navy sm:text-5xl md:text-6xl"
            >
              We miss you.
            </h1>
            <p className="mt-6 max-w-xl text-base text-cf-charcoal/80 sm:text-lg">
              It&rsquo;s been a while. We&rsquo;ve added new fabrics, brought
              back some of our most-loved frames, and would love for you to
              come see what&rsquo;s new.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <CtaButton href="/shop" data-testid="winback-shop-cta">
                Browse what&rsquo;s new
              </CtaButton>
              <Link
                href="/visit"
                className="inline-flex h-12 items-center justify-center rounded-md border border-cf-navy/20 px-6 text-sm font-medium text-cf-navy transition-colors hover:bg-cf-navy/5"
              >
                Visit the shop
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="winback-values"
        className="bg-white py-16 md:py-20 dark:bg-cf-cream"
      >
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2
            id="winback-values"
            className="font-heading text-2xl font-semibold text-cf-navy sm:text-3xl"
          >
            What you came here for
          </h2>
          <ul className="mt-8 grid gap-8 sm:grid-cols-3">
            <li>
              <h3 className="font-heading text-lg font-semibold text-cf-navy">
                American-made comfort
              </h3>
              <p className="mt-2 text-sm text-cf-charcoal/80">
                Hardwood frames built in North Carolina with a 15-year warranty.
              </p>
            </li>
            <li>
              <h3 className="font-heading text-lg font-semibold text-cf-navy">
                Fabrics you actually want
              </h3>
              <p className="mt-2 text-sm text-cf-charcoal/80">
                Free swatches mailed out — try before you commit.
              </p>
            </li>
            <li>
              <h3 className="font-heading text-lg font-semibold text-cf-navy">
                Local delivery
              </h3>
              <p className="mt-2 text-sm text-cf-charcoal/80">
                White-glove delivery across the Carolinas, set up in your room.
              </p>
            </li>
          </ul>
        </div>
      </section>

      <section
        aria-labelledby="winback-signup"
        className="bg-cf-footer-bg py-16 text-cf-cream md:py-20"
      >
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-2 md:items-center lg:px-8">
          <div>
            <h2
              id="winback-signup"
              className="font-heading text-2xl font-semibold sm:text-3xl"
            >
              Stay close to the shop.
            </h2>
            <p className="mt-3 max-w-md text-sm text-cf-cream/80">
              One email a month — new arrivals, sales, the occasional studio
              update. No noise.
            </p>
          </div>
          <div>
            <NewsletterSignup />
          </div>
        </div>
      </section>
    </main>
  );
}
