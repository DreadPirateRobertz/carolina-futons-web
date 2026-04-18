import type { Metadata } from "next";

import { BUSINESS } from "@/lib/business/contact-info";

export const metadata: Metadata = {
  title: "Returns — Carolina Futons",
  description:
    "Carolina Futons' return policy: the window, what's refundable, and how restocking works on furniture and mattresses.",
};

export default function ReturnsPage() {
  return (
    <main className="mx-auto w-full px-4 py-12 sm:px-6 sm:py-16">
      <article className="mx-auto max-w-[65ch] space-y-8 font-source-sans text-cf-ink">
        <header className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
            Policies
          </p>
          <h1 className="font-playfair text-4xl font-semibold tracking-tight sm:text-5xl">
            Returns
          </h1>
          <p className="text-lg leading-relaxed text-cf-muted">
            We stand behind what we sell. If something isn’t right, here’s how
            to make it right.
          </p>
        </header>

        <section aria-labelledby="returns-window" className="space-y-4">
          <h2
            id="returns-window"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            The return window
          </h2>
          <p className="leading-relaxed">
            Most items are returnable within 30 days of delivery in like-new
            condition. “Like-new” means unused, undamaged, and in the original
            packaging. Before you ship anything back, contact us — we’ll
            confirm the return is eligible and issue a return authorization.
          </p>
        </section>

        <section aria-labelledby="returns-restocking" className="space-y-4">
          <h2
            id="returns-restocking"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            Restocking and return shipping
          </h2>
          <p className="leading-relaxed">
            Frames and accessories incur a 15% restocking fee. Mattresses
            incur a 25% restocking fee because we cannot resell them as new.
            You are responsible for return shipping unless the return is due
            to our error or a shipping-damage claim, in which case we cover it.
          </p>
        </section>

        <section aria-labelledby="returns-custom" className="space-y-4">
          <h2
            id="returns-custom"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            Custom and made-to-order items
          </h2>
          <p className="leading-relaxed">
            Custom covers, custom stain finishes, and made-to-order Murphy bed
            configurations are final sale. If a custom piece arrives with a
            manufacturing defect, contact us and we’ll repair or replace it
            under warranty.
          </p>
        </section>

        <section aria-labelledby="returns-damaged" className="space-y-4">
          <h2
            id="returns-damaged"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            Damaged on arrival
          </h2>
          <p className="leading-relaxed">
            Please inspect every carton before the carrier leaves. If you see
            shipping damage, note it on the delivery receipt and take photos.
            Email the photos to us within 48 hours and we’ll get a replacement
            on its way.
          </p>
        </section>

        <section aria-labelledby="returns-start" className="space-y-4">
          <h2
            id="returns-start"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            Start a return
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
            with your order number and what you’d like to return. We’ll guide
            you through from there.
          </p>
        </section>
      </article>
    </main>
  );
}
