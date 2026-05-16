import type { Metadata } from "next";
import { CfLink } from "@/components/ui/cf-link";

import { FaqBrowser } from "@/components/faq/FaqBrowser";
import { JsonLd } from "@/components/seo/JsonLd";
import { groupFaqsByCategory, listFaqs } from "@/lib/cms/faq";
import { buildFaqPageSchema } from "@/lib/seo/json-ld";
import { DEFAULT_OG_IMAGE } from "@/lib/og";

// cf-3qt.4.1: /faq page.
//
// Pulls FAQs from the Wix `FAQ` collection (fields {question, answer,
// category, sortOrder}) via the listFaqs reader, which falls back to the
// FALLBACK_FAQS seed if the live read returns empty or throws — keeps
// the page useful in pre-launch envs where the headless client can't
// reach the live collection yet.
//
// Sections collapse via native <details>/<summary> rather than a JS
// disclosure pattern so the page works without hydration and the first
// paint is immediately interactive (browser handles aria-expanded). The
// FAQPage JSON-LD schema is fed the full deduped list so Search Console
// rich-result eligibility lines up regardless of which sections the user
// happens to expand.

const TITLE = "FAQ — Carolina Futons";
const DESCRIPTION =
  "Common questions about Carolina Futons — shipping, warranty, returns, showroom hours. Family-owned in Hendersonville, NC since 1991.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
};

export default async function FaqPage() {
  const result = await listFaqs();
  const groups = groupFaqsByCategory(result.items);
  const schema = buildFaqPageSchema(
    result.items.map((it) => ({ question: it.question, answer: it.answer })),
  );

  return (
    <main className="mx-auto w-full px-4 py-12 sm:px-6 sm:py-16">
      <JsonLd id="jsonld-faq" schema={schema} />
      <article className="mx-auto max-w-[65ch] space-y-8 font-source-sans text-cf-ink">
        <header className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
            Help &amp; FAQ
          </p>
          <h1 className="font-playfair text-4xl font-semibold tracking-tight sm:text-5xl">
            Frequently asked questions
          </h1>
          <p className="text-lg leading-relaxed text-cf-muted">
            Don&rsquo;t see your question? We answer email at{" "}
            <CfLink href="mailto:carolinafutons@gmail.com">carolinafutons@gmail.com</CfLink>{" "}
            within one business day.
          </p>
        </header>

        {groups.length === 0 ? (
          <p className="text-base text-cf-muted">
            We&rsquo;re still gathering questions — please email us in the
            meantime.
          </p>
        ) : (
          <FaqBrowser groups={groups} />
        )}
      </article>
    </main>
  );
}
