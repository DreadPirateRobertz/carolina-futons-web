import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Journal — Carolina Futons",
  description:
    "Notes from a family-owned futon shop in Hendersonville, North Carolina — buying guides, room ideas, and stories from the showroom floor.",
};

const LAST_UPDATED = "April 18, 2026";

export default function BlogPage() {
  return (
    <main className="mx-auto w-full px-4 py-12 sm:px-6 sm:py-16">
      <article className="mx-auto max-w-[65ch] space-y-8 font-source-sans text-cf-ink">
        <header className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
            Journal
          </p>
          <h1 className="font-playfair text-4xl font-semibold tracking-tight sm:text-5xl">
            Notes from the Showroom
          </h1>
          <p className="text-sm text-cf-muted">Last updated {LAST_UPDATED}</p>
        </header>

        <p className="text-lg leading-relaxed">
          Carolina Futons has sold solid-wood futon frames and natural
          mattresses out of Hendersonville, North Carolina since 1991. The
          journal is where we share what we&rsquo;ve learned — what makes a
          futon last, how to set up a small bedroom or studio, and the
          occasional behind-the-counter story from thirty-plus years on the
          showroom floor.
        </p>

        <section className="space-y-4">
          <h2 className="font-playfair text-2xl font-semibold tracking-tight">
            Coming soon
          </h2>
          <p className="leading-relaxed">
            We&rsquo;re sketching the first round of posts now: buying guides
            for full vs. queen futons, the difference between cotton and
            wool-wrapped innerspring mattresses, and how our 15-year frame
            warranty actually works in practice. Subscribe below if
            you&rsquo;d like an email when the first one goes up — no
            promotions, no algorithmic feed, just the post.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-playfair text-2xl font-semibold tracking-tight">
            Stay in touch
          </h2>
          <p className="leading-relaxed">
            For now, the best way to follow along is by email. Drop us a line
            at{" "}
            <a
              href="mailto:carolinafutons@gmail.com"
              className="text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
            >
              carolinafutons@gmail.com
            </a>{" "}
            and we&rsquo;ll add you to the journal list. You&rsquo;re also
            welcome to stop by the showroom in Hendersonville any time
            we&rsquo;re open.
          </p>
        </section>
      </article>
    </main>
  );
}
