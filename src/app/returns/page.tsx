import type { Metadata } from "next";

import { BUSINESS } from "@/lib/business/contact-info";
import { DEFAULT_OG_IMAGE } from "@/lib/og";
import { twitterFromOpenGraph } from "@/lib/seo/twitter-from-og";
import { getSiteContent } from "@/lib/cms/site-content";

const TITLE = "Returns — Carolina Futons";
const DESCRIPTION =
  "Carolina Futons' return policy: the window, what's refundable, and how restocking works on furniture and mattresses.";

const OPEN_GRAPH = {
  title: TITLE,
  description: DESCRIPTION,
  images: [DEFAULT_OG_IMAGE],
};

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: OPEN_GRAPH,
  twitter: twitterFromOpenGraph(OPEN_GRAPH),
};

const RETURNS_COPY_FALLBACKS = {
  eyebrow: "Policies",
  introHeading: "Returns",
  introBody: "We stand behind what we sell. If something isn't right, here's how to make it right.",
  windowHeading: "The return window",
  windowBody:
    'Most items are returnable within 30 days of delivery in like-new condition. “Like-new” means unused, undamaged, and in the original packaging. Before you ship anything back, contact us — we’ll confirm the return is eligible and issue a return authorization. Unauthorized returns may be refused at our discretion.',
  restockingHeading: "Restocking and return shipping",
  restockingBody1:
    "Frames and accessories incur a 15% restocking fee. Mattresses incur a 25% restocking fee because we cannot resell them as new once they’ve left our facility.",
  restockingBody2:
    "You are responsible for return shipping costs unless the return is due to our error (wrong item sent, manufacturing defect) or a confirmed shipping-damage claim. Return freight for a full-size futon frame typically runs $80–$180 depending on your location.",
  customHeading: "Custom and made-to-order items",
  damagedHeading: "Damaged on arrival",
  faqHeading: "Common returns questions",
  startHeading: "Start a return",
} as const;

const RETURNS_FAQS = [
  {
    q: "Do I need to keep the original packaging?",
    a: 'Yes, for the return to be accepted. "Like-new in original packaging" means the box, inner foam, and any packing material. If you\'ve already broken down the packaging, call us before attempting a return — we may be able to source replacement materials in some cases.',
  },
  {
    q: "Can I return a mattress I've slept on?",
    a: "No. Mattresses must be in original, unused condition — meaning the plastic wrap has not been removed. Once unsealed, a mattress cannot be returned. If you're unsure about a mattress, visit the showroom to try it before ordering.",
  },
  {
    q: "What counts as 'shipping damage' versus normal wear?",
    a: "Shipping damage is physical damage that occurred in transit — crushed corners, punctures, cracked joints from handling. You must note this on the delivery receipt while the driver is present and photograph it within 48 hours. Normal wear (scuffs from moving around your home, fabric snags) is not covered.",
  },
  {
    q: "How long does a refund take?",
    a: "Once we receive and inspect the returned item, refunds are processed within three to five business days. Depending on your payment method, it may take an additional two to ten business days to appear on your statement.",
  },
  {
    q: "Can I exchange instead of return?",
    a: "Yes, and exchanges typically work out better for you — you avoid the return shipping cost and we waive the restocking fee when you're applying the credit toward a new order. Call us and we'll walk through the options.",
  },
  {
    q: "What if the product looks different than I expected?",
    a: "Color variation, grain pattern, and knot character in solid wood are inherent to natural materials, not defects. We photograph our products accurately, but monitor colors vary. If you're concerned about a specific finish, request a finish sample before ordering — we're happy to send one.",
  },
  {
    q: "I bought a frame that doesn't fit my space. Can I return it?",
    a: "Yes, if it's within 30 days and in original condition. The 15% restocking fee applies, and you're responsible for return freight. Check our dimension specs carefully before ordering — futon frames are larger than they appear in photos, especially with a mattress on.",
  },
];

export default async function ReturnsPage() {
  const [
    eyebrow,
    introHeading,
    introBody,
    windowHeading,
    windowBody,
    restockingHeading,
    restockingBody1,
    restockingBody2,
    customHeading,
    damagedHeading,
    faqHeading,
    startHeading,
  ] = await Promise.all([
    getSiteContent("returns.eyebrow", RETURNS_COPY_FALLBACKS.eyebrow),
    getSiteContent("returns.intro.heading", RETURNS_COPY_FALLBACKS.introHeading),
    getSiteContent("returns.intro.body", RETURNS_COPY_FALLBACKS.introBody),
    getSiteContent("returns.window.heading", RETURNS_COPY_FALLBACKS.windowHeading),
    getSiteContent("returns.window.body", RETURNS_COPY_FALLBACKS.windowBody),
    getSiteContent("returns.restocking.heading", RETURNS_COPY_FALLBACKS.restockingHeading),
    getSiteContent("returns.restocking.body-1", RETURNS_COPY_FALLBACKS.restockingBody1),
    getSiteContent("returns.restocking.body-2", RETURNS_COPY_FALLBACKS.restockingBody2),
    getSiteContent("returns.custom.heading", RETURNS_COPY_FALLBACKS.customHeading),
    getSiteContent("returns.damaged.heading", RETURNS_COPY_FALLBACKS.damagedHeading),
    getSiteContent("returns.faq.heading", RETURNS_COPY_FALLBACKS.faqHeading),
    getSiteContent("returns.start.heading", RETURNS_COPY_FALLBACKS.startHeading),
  ]);

  return (
    <main className="mx-auto w-full px-4 py-12 sm:px-6 sm:py-16">
      <article className="mx-auto max-w-[65ch] space-y-8 font-source-sans text-cf-ink">
        <header className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
            {eyebrow}
          </p>
          <h1 className="font-playfair text-4xl font-semibold tracking-tight sm:text-5xl">
            {introHeading}
          </h1>
          <p className="text-lg leading-relaxed text-cf-muted">{introBody}</p>
        </header>

        <section aria-labelledby="returns-window" className="space-y-4">
          <h2
            id="returns-window"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            {windowHeading}
          </h2>
          <p className="leading-relaxed">{windowBody}</p>
        </section>

        <section aria-labelledby="returns-restocking" className="space-y-4">
          <h2
            id="returns-restocking"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            {restockingHeading}
          </h2>
          <p className="leading-relaxed">{restockingBody1}</p>
          <p className="leading-relaxed">{restockingBody2}</p>
        </section>

        <section aria-labelledby="returns-custom" className="space-y-4">
          <h2
            id="returns-custom"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            {customHeading}
          </h2>
          <p className="leading-relaxed">
            Custom covers, custom stain finishes, and made-to-order Murphy bed
            configurations are final sale. We review each custom order with you
            before production begins — that confirmation is your opportunity to
            catch any errors. If a custom piece arrives with a manufacturing
            defect, contact us and we&apos;ll repair or replace it under the{" "}
            <a
              href="/warranty"
              className="text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
            >
              {BUSINESS.warrantyYears}-year warranty
            </a>
            .
          </p>
        </section>

        <section aria-labelledby="returns-damaged" className="space-y-4">
          <h2
            id="returns-damaged"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            {damagedHeading}
          </h2>
          <p className="leading-relaxed">
            Please inspect every carton before the carrier leaves. If you see
            visible shipping damage — crushed corners, punctures, cracked joints
            visible through the box — note it on the delivery receipt while the
            driver is still there. Take photos immediately. Email the photos to{" "}
            <a
              href={BUSINESS.emailHref}
              className="text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
            >
              {BUSINESS.email}
            </a>{" "}
            within 48 hours. We&apos;ll file the freight claim on your behalf and get
            a replacement moving as quickly as possible.
          </p>
          <p className="leading-relaxed">
            If you sign the delivery receipt without noting damage, it becomes
            very difficult to file a carrier claim later. When in doubt, note
            &ldquo;subject to inspection&rdquo; before signing.
          </p>
        </section>

        <section aria-labelledby="returns-faq" className="space-y-6">
          <h2
            id="returns-faq"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            {faqHeading}
          </h2>
          <dl className="space-y-5">
            {RETURNS_FAQS.map(({ q, a }) => (
              <div key={q} className="space-y-1">
                <dt className="font-semibold leading-snug">{q}</dt>
                <dd className="leading-relaxed text-cf-muted">{a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="returns-start" className="space-y-4">
          <h2
            id="returns-start"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            {startHeading}
          </h2>
          <p className="leading-relaxed">
            Call{" "}
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
            </a>{" "}
            with your order number and what you&apos;d like to return. We&apos;ll confirm
            eligibility, issue a return authorization, and walk you through the
            rest. Also see our{" "}
            <a
              href="/shipping"
              className="text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
            >
              shipping policy
            </a>{" "}
            and{" "}
            <a
              href="/warranty"
              className="text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
            >
              {BUSINESS.warrantyYears}-year warranty
            </a>
            .
          </p>
        </section>
      </article>
    </main>
  );
}
