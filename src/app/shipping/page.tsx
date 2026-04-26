import type { Metadata } from "next";

import { BUSINESS } from "@/lib/business/contact-info";

export const metadata: Metadata = {
  title: "Shipping — Carolina Futons",
  description:
    "How Carolina Futons ships frames, mattresses, and Murphy beds — lead times, carriers, and in-home delivery options.",
};

const SHIPPING_FAQS = [
  {
    q: "Do I need to be home for freight delivery?",
    a: "Yes. Freight carriers (used for frames, mattresses, and Murphy beds) require a signature and schedule a delivery window in advance. The driver will call 24–48 hours ahead. UPS Ground parcels are left at the door and don't require you to be home.",
  },
  {
    q: "Can I choose my delivery date?",
    a: "Freight carriers offer a delivery window — usually a four-hour block — on a date they propose. You can ask them to reschedule once at no charge. Same-day or next-day appointment requests typically aren't available.",
  },
  {
    q: "What if my building has no elevator and I'm on an upper floor?",
    a: "Standard freight delivery is to the first accessible dry area — often a building lobby or first-floor entryway. White-glove service is required to bring large items up stairs or through tight corridors. Select it at checkout or call us and we'll add it.",
  },
  {
    q: "How do I track my order?",
    a: "You'll get a tracking number by email once your order ships. Freight shipments are tracked through the carrier's portal. If you haven't received tracking within five business days of your order confirmation, email us and we'll check on it.",
  },
  {
    q: "Do you ship outside the continental US?",
    a: "We ship to all 48 continental states. For Hawaii, Alaska, and international destinations, call us — we can quote freight costs directly, though they are significantly higher than standard rates.",
  },
  {
    q: "What happens if my item arrives damaged?",
    a: 'Note any visible damage on the delivery receipt before the carrier leaves and photograph everything. Email the photos to us at ' + BUSINESS.email + ' within 48 hours. We\'ll file the freight claim and get a replacement moving as quickly as possible.',
  },
  {
    q: "Can I change my shipping address after ordering?",
    a: "Contact us as soon as possible — address changes are possible before the item ships but not after it's in transit. For freight shipments, a reroute fee from the carrier may apply.",
  },
];

export default function ShippingPage() {
  return (
    <main className="mx-auto w-full px-4 py-12 sm:px-6 sm:py-16">
      <article className="mx-auto max-w-[65ch] space-y-8 font-source-sans text-cf-ink">
        <header className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
            Policies
          </p>
          <h1 className="font-playfair text-4xl font-semibold tracking-tight sm:text-5xl">
            Shipping
          </h1>
          <p className="text-lg leading-relaxed text-cf-muted">
            We've been shipping futons since {BUSINESS.foundedYear}. Here's
            what to expect from order confirmation to delivery.
          </p>
        </header>

        <section aria-labelledby="shipping-lead-times" className="space-y-4">
          <h2
            id="shipping-lead-times"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            Lead times
          </h2>
          <p className="leading-relaxed">
            Most in-stock frames and mattresses ship within two to four
            business days. Made-to-order items — custom covers, specific stain
            finishes, and configured Murphy beds — typically ship in two to
            four weeks. Your order confirmation email lists the expected ship
            window for each line item.
          </p>
          <p className="leading-relaxed">
            If your item is needed by a specific date, call us before ordering.
            We'll check current stock levels and give you a realistic estimate —
            not a promise we can't keep.
          </p>
        </section>

        <section aria-labelledby="shipping-carriers" className="space-y-4">
          <h2
            id="shipping-carriers"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            Carriers and transit
          </h2>
          <p className="leading-relaxed">
            Smaller items (covers, hardware kits, accessories) ship via UPS
            Ground and are left at your door with no signature required. Frames,
            mattresses, and Murphy beds ship via common carrier freight — the
            driver will call ahead to schedule a delivery window. Transit time
            from {BUSINESS.city}, {BUSINESS.state} is typically two to seven
            business days for the continental US; the Pacific Northwest and
            Mountain West tend toward the longer end.
          </p>
        </section>

        <section aria-labelledby="shipping-in-home" className="space-y-4">
          <h2
            id="shipping-in-home"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            In-home delivery
          </h2>
          <p className="leading-relaxed">
            Standard freight delivery is curbside or to the first accessible
            dry area. For an additional fee you can upgrade:
          </p>
          <ul className="ml-4 space-y-2 leading-relaxed">
            <li>
              <strong>Room-of-choice</strong> — the crew brings the item inside
              and places it where you'd like, including up one flight of stairs.
            </li>
            <li>
              <strong>White-glove</strong> — room-of-choice plus unboxing,
              assembly, and removal of all packaging. The best option for Murphy
              beds and platform beds.
            </li>
          </ul>
          <p className="leading-relaxed">
            Both options appear at checkout for eligible products and ZIP codes.
            If you don't see them, call us — availability depends on your
            location and the carrier serving your area.
          </p>
        </section>

        <section aria-labelledby="shipping-local" className="space-y-4">
          <h2
            id="shipping-local"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            Local delivery and pickup
          </h2>
          <p className="leading-relaxed">
            Within 60 miles of {BUSINESS.city}, {BUSINESS.state} we offer our
            own in-home delivery — two-person crew, two-hour arrival window,
            usually available within the week. We deliver to the room of your
            choice and can handle stairs. Assembly is available on request.
          </p>
          <p className="leading-relaxed">
            You're also welcome to pick up at the showroom at {BUSINESS.street}.
            We'll have your order staged and ready, and we'll help you load.
            Bring a truck or trailer for frames — most futon frames don't fit in
            a sedan even disassembled.
          </p>
        </section>

        <section aria-labelledby="shipping-faq" className="space-y-6">
          <h2
            id="shipping-faq"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            Common shipping questions
          </h2>
          <dl className="space-y-5">
            {SHIPPING_FAQS.map(({ q, a }) => (
              <div key={q} className="space-y-1">
                <dt className="font-semibold leading-snug">{q}</dt>
                <dd className="leading-relaxed text-cf-muted">{a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="shipping-questions" className="space-y-4">
          <h2
            id="shipping-questions"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            Still have questions?
          </h2>
          <p className="leading-relaxed">
            Call us at{" "}
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
            . A real person will answer. Also see our{" "}
            <a
              href="/returns"
              className="text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
            >
              returns policy
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
