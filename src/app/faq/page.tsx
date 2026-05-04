import type { Metadata } from "next";
import { CfLink } from "@/components/ui/cf-link";

import { JsonLd } from "@/components/seo/JsonLd";
import { groupFaqsByCategory, listFaqs } from "@/lib/cms/faq";
import { buildFaqPageSchema } from "@/lib/seo/json-ld";

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

export const metadata: Metadata = {
  title: "FAQ — Carolina Futons",
  description:
    "Common questions about Carolina Futons — shipping, warranty, returns, showroom hours. Family-owned in Hendersonville, NC since 1991.",
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
          <div className="space-y-10">
            {groups.map((group) => (
              <section
                key={group.category}
                aria-labelledby={`faq-cat-${slugify(group.category)}`}
                className="space-y-3"
              >
                <h2
                  id={`faq-cat-${slugify(group.category)}`}
                  className="font-playfair text-2xl font-semibold tracking-tight"
                >
                  {group.category}
                </h2>
                <ul className="space-y-2">
                  {group.items.map((item, i) => (
                    <li key={`${group.category}-${i}-${item.question}`}>
                      {/* Two-state bg: closed=white/dark-slate, open=cream/dark-slate-80 — mirrors light→dark tonal shift */}
                      <details className="group rounded-md border border-cf-divider bg-white px-4 py-3 transition-colors open:border-cf-cta/40 open:bg-cf-cream dark:bg-cf-cream dark:open:bg-cf-cream/80">
                        <summary className="cursor-pointer list-none text-base font-medium text-cf-ink marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                          <span className="flex items-center justify-between gap-3">
                            <span>{item.question}</span>
                            <span
                              aria-hidden="true"
                              className="shrink-0 text-cf-muted transition-transform group-open:rotate-45"
                            >
                              +
                            </span>
                          </span>
                        </summary>
                        <p className="mt-3 text-base leading-relaxed text-cf-charcoal/85">
                          {item.answer}
                        </p>
                      </details>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </article>
    </main>
  );
}

function slugify(input: string): string {
  return input
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
