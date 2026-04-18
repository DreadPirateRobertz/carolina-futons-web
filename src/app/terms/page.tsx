import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Carolina Futons",
  description:
    "The terms that govern your use of the Carolina Futons website, including ordering, delivery, returns, and warranty.",
};

const LAST_UPDATED = "April 18, 2026";

export default function TermsPage() {
  return (
    <main className="mx-auto w-full px-4 py-12 sm:px-6 sm:py-16">
      <article className="mx-auto max-w-[65ch] space-y-8 font-source-sans text-cf-ink">
        <header className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
            Legal
          </p>
          <h1 className="font-playfair text-4xl font-semibold tracking-tight sm:text-5xl">
            Terms of Service
          </h1>
          <p className="text-sm text-cf-muted">Last updated {LAST_UPDATED}</p>
        </header>

        <p className="text-lg leading-relaxed">
          These terms govern your use of carolinafutons.com and any purchase
          you make through the site. By browsing or ordering, you agree to
          them. They are written plainly on purpose — we want them to be
          legible, not intimidating.
        </p>

        <section className="space-y-4">
          <h2 className="font-playfair text-2xl font-semibold tracking-tight">
            Orders and pricing
          </h2>
          <p className="leading-relaxed">
            Prices and availability are displayed on each product page and
            may change without notice. An order is confirmed only after we
            send you an email receipt. If we cannot fulfill an order — for
            example, a product is discontinued or mispriced — we will contact
            you and refund any charges in full.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-playfair text-2xl font-semibold tracking-tight">
            Delivery
          </h2>
          <p className="leading-relaxed">
            We ship American-made furniture directly from our suppliers or
            our Hendersonville warehouse. Delivery windows on each product
            page are estimates — carrier schedules and production lead times
            can shift. We will notify you of any meaningful delay.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-playfair text-2xl font-semibold tracking-tight">
            Returns and exchanges
          </h2>
          <p className="leading-relaxed">
            Most items can be returned within 30 days of delivery in
            like-new condition. Custom-made and clearance items are final
            sale. The buyer is responsible for return shipping unless the
            item arrived damaged or defective.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-playfair text-2xl font-semibold tracking-tight">
            Warranty
          </h2>
          <p className="leading-relaxed">
            Manufacturer warranties apply per product; details appear on the
            product page or in the documentation shipped with your order.
            Carolina Futons will help facilitate warranty claims for items
            purchased through us.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-playfair text-2xl font-semibold tracking-tight">
            Limitation of liability
          </h2>
          <p className="leading-relaxed">
            To the fullest extent permitted by law, Carolina Futons is not
            liable for indirect or consequential damages arising from your
            use of the site or our products. Nothing in these terms limits
            rights that cannot be waived under applicable law.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-playfair text-2xl font-semibold tracking-tight">
            Contact
          </h2>
          <p className="leading-relaxed">
            Questions about these terms? Email{" "}
            <a
              href="mailto:hello@carolinafutons.com"
              className="text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
            >
              hello@carolinafutons.com
            </a>
            .
          </p>
        </section>
      </article>
    </main>
  );
}
