import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Carolina Futons",
  description:
    "How Carolina Futons collects, uses, and protects the information you share with us online and in-store.",
};

const LAST_UPDATED = "April 18, 2026";

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto w-full px-4 py-12 sm:px-6 sm:py-16">
      <article className="mx-auto max-w-[65ch] space-y-8 font-source-sans text-cf-ink">
        <header className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
            Legal
          </p>
          <h1 className="font-playfair text-4xl font-semibold tracking-tight sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="text-sm text-cf-muted">Last updated {LAST_UPDATED}</p>
        </header>

        <p className="text-lg leading-relaxed">
          Carolina Futons is a family-owned retailer based in Hendersonville,
          North Carolina. We respect your privacy and keep the data we collect
          to what we genuinely need to run the business — taking orders,
          delivering furniture, answering questions, and improving the
          storefront.
        </p>

        <section className="space-y-4">
          <h2 className="font-playfair text-2xl font-semibold tracking-tight">
            Information we collect
          </h2>
          <p className="leading-relaxed">
            When you place an order, create an account, or contact us, we
            collect the information you provide directly — your name, shipping
            and billing address, email, phone number, and payment details.
            When you browse the site, our hosting and analytics providers
            record standard request metadata such as IP address, device type,
            and referring page.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-playfair text-2xl font-semibold tracking-tight">
            How we use your information
          </h2>
          <p className="leading-relaxed">
            We use the information above to fulfill orders, arrange delivery,
            provide customer support, respond to warranty claims, send
            transactional emails related to your purchases, and improve the
            performance and usability of the site. We do not sell your
            personal information.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-playfair text-2xl font-semibold tracking-tight">
            Service providers
          </h2>
          <p className="leading-relaxed">
            We share information with a limited set of vetted service
            providers who help us operate: our e-commerce platform
            (Vercel/Next.js), payment processors, shipping carriers, email
            deliverability, and analytics. Each is contractually limited to
            using the data only to provide their service to us.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-playfair text-2xl font-semibold tracking-tight">
            Cookies and similar technologies
          </h2>
          <p className="leading-relaxed">
            The site uses cookies and similar technologies to keep your cart,
            remember your session, and measure site performance. You can
            disable non-essential cookies through your browser settings;
            essential cookies are required for checkout and account features
            to function.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-playfair text-2xl font-semibold tracking-tight">
            Your choices
          </h2>
          <p className="leading-relaxed">
            You can request a copy of the personal information we hold about
            you, ask us to correct inaccurate records, or request deletion of
            data we are not legally required to retain. Contact us using the
            details below and we will respond within 30 days.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-playfair text-2xl font-semibold tracking-tight">
            Contact
          </h2>
          <p className="leading-relaxed">
            Questions about this policy? Email us at{" "}
            <a
              href="mailto:carolinafutons@gmail.com"
              className="text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
            >
              carolinafutons@gmail.com
            </a>{" "}
            or call the store during regular business hours.
          </p>
        </section>
      </article>
    </main>
  );
}
