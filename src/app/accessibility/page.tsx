import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accessibility — Carolina Futons",
  description:
    "Our commitment to making carolinafutons.com usable by everyone, including customers who rely on assistive technology.",
};

const LAST_UPDATED = "April 18, 2026";

export default function AccessibilityPage() {
  return (
    <main className="mx-auto w-full px-4 py-12 sm:px-6 sm:py-16">
      <article className="mx-auto max-w-[65ch] space-y-8 font-source-sans text-cf-ink">
        <header className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
            Commitment
          </p>
          <h1 className="font-playfair text-4xl font-semibold tracking-tight sm:text-5xl">
            Accessibility
          </h1>
          <p className="text-sm text-cf-muted">Last updated {LAST_UPDATED}</p>
        </header>

        <p className="text-lg leading-relaxed">
          Carolina Futons is committed to making carolinafutons.com usable by
          everyone, including customers who rely on screen readers, keyboard
          navigation, or reduced-motion settings. We hold ourselves to the{" "}
          <abbr title="Web Content Accessibility Guidelines">WCAG</abbr> 2.1
          Level AA standard as a baseline.
        </p>

        <section className="space-y-4">
          <h2 className="font-playfair text-2xl font-semibold tracking-tight">
            What we do
          </h2>
          <p className="leading-relaxed">
            We build the site with semantic HTML so structure is conveyed to
            assistive technology, test color contrast against WCAG AA, honor
            the operating-system <code>prefers-reduced-motion</code> setting
            for animations, ensure every interactive element is reachable by
            keyboard, and ship visible focus indicators on buttons, links,
            and form fields.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-playfair text-2xl font-semibold tracking-tight">
            Known limitations
          </h2>
          <p className="leading-relaxed">
            Accessibility is an ongoing effort. Some product media is
            supplied by manufacturers and may not yet have alternative text;
            older PDF spec sheets may not be fully tagged. We prioritize
            fixing gaps reported to us and re-audit the site on each major
            release.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-playfair text-2xl font-semibold tracking-tight">
            Feedback
          </h2>
          <p className="leading-relaxed">
            If you run into a barrier on the site — anything that prevents
            you from finding, understanding, or completing what you came to
            do — please tell us. We read every message and will follow up.
          </p>
          <p className="leading-relaxed">
            Email{" "}
            <a
              href="mailto:hello@carolinafutons.com"
              className="text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
            >
              hello@carolinafutons.com
            </a>{" "}
            with the page URL, a description of the issue, and the assistive
            technology you were using, if any.
          </p>
        </section>
      </article>
    </main>
  );
}
