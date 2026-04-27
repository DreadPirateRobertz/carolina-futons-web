import type { Metadata } from "next";

import { BUSINESS } from "@/lib/business/contact-info";

export const metadata: Metadata = {
  title: "Warranty — Carolina Futons",
  description: `The Carolina Futons ${BUSINESS.warrantyYears}-year warranty: what it covers, how to file a claim, and what we stand behind.`,
};

const WARRANTY_FAQS = [
  {
    q: "Does the 15-year warranty cover all futon frames or just certain models?",
    a: `The ${BUSINESS.warrantyYears}-year warranty covers all futon frames we sell, including bi-fold, tri-fold, loveseat, and lounger configurations, under normal residential use. Commercial and rental-property use is excluded.`,
  },
  {
    q: "My latch mechanism stopped working after a few years. Is that covered?",
    a: "Yes. Latch mechanisms are covered parts. Email us with your order number and a photo of the broken latch and we'll ship a replacement part at no charge. Most latch repairs are a five-minute swap.",
  },
  {
    q: "The wood on my frame is splitting at the joint. Is that a defect?",
    a: "It depends. A joint that separates at the glue line or fastener is a manufacturing defect and is covered. Surface checking (hairline cracks along the grain of solid wood) is a normal characteristic of natural wood, especially in low-humidity environments, and is not covered. Photos help us tell the difference quickly.",
  },
  {
    q: "I moved and the frame was damaged in the move. Is that covered?",
    a: "No. The warranty covers manufacturing defects under normal residential use, not damage from moving. Futon frames are heavy and can be damaged if improperly disassembled or transported. We're happy to advise on the safest way to move a frame if you call ahead.",
  },
  {
    q: "We sold the frame — can the new owner use the warranty?",
    a: "No. The warranty applies to the original purchaser only and is not transferable. The new owner should be aware of this before purchasing second-hand.",
  },
  {
    q: "I lost my order confirmation. Can I still file a warranty claim?",
    a: "Call us with the approximate purchase date and your contact information — we can often look up the order in our records. It's easier with a confirmation number, but not always required for long-time customers.",
  },
  {
    q: "What's the typical turnaround time on a warranty claim?",
    a: "We respond to warranty emails within one business day. If replacement parts are needed, most ship within two to four business days. Complex repairs or full replacements take longer — we'll give you a timeline once we assess the situation.",
  },
];

export default function WarrantyPage() {
  return (
    <main className="mx-auto w-full px-4 py-12 sm:px-6 sm:py-16">
      <article className="mx-auto max-w-[65ch] space-y-8 font-source-sans text-cf-ink">
        <header className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cf-cta">
            Policies
          </p>
          <h1 className="font-playfair text-4xl font-semibold tracking-tight sm:text-5xl">
            {BUSINESS.warrantyYears}-year warranty
          </h1>
          <p className="text-lg leading-relaxed text-cf-muted">
            We&apos;ve been building futons since {BUSINESS.foundedYear}. Our frames
            are backed by a {BUSINESS.warrantyYears}-year warranty against
            manufacturing defects — the longest in the business.
          </p>
        </header>

        <section aria-labelledby="warranty-covers" className="space-y-4">
          <h2
            id="warranty-covers"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            What the warranty covers
          </h2>
          <p className="leading-relaxed">
            The {BUSINESS.warrantyYears}-year warranty covers manufacturing
            defects in frames under normal residential use — cracked joints,
            failed hardware, delaminated panels, or latch mechanisms that stop
            working. We&apos;ll repair the frame, send replacement parts, or in cases
            where neither is practical, replace the piece.
          </p>
          <p className="leading-relaxed">
            &ldquo;Manufacturing defect&rdquo; means something failed because of how it was
            built, not because of how it was used. A joint that lets go at the
            glue line is a defect. A frame that breaks because it was used as a
            step stool is not. If you&apos;re not sure which side of the line your
            situation falls on, send us photos — we&apos;ll tell you straight.
          </p>
        </section>

        <section aria-labelledby="warranty-mattresses" className="space-y-4">
          <h2
            id="warranty-mattresses"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            Mattresses and covers
          </h2>
          <p className="leading-relaxed">
            Mattresses carry the manufacturer&apos;s warranty from the original
            maker, which varies by model — typically ten years on our premium
            innerspring and foam lines. If you have a mattress issue, we&apos;ll
            connect you directly with the manufacturer and advocate on your
            behalf.
          </p>
          <p className="leading-relaxed">
            Covers and accessories are warranted against manufacturing defects
            for one year. Fabric fading, pilling, and normal wear are not
            covered — these are characteristics of upholstery fabric in active
            use.
          </p>
        </section>

        <section aria-labelledby="warranty-excludes" className="space-y-4">
          <h2
            id="warranty-excludes"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            What the warranty does not cover
          </h2>
          <ul className="ml-4 list-none space-y-2 leading-relaxed">
            <li>Normal wear — scuffs, scratches, surface checking in solid wood</li>
            <li>Fabric fading or pilling on covers</li>
            <li>Commercial or rental-property use</li>
            <li>Damage from moving, improper assembly, or modifications we didn&apos;t make</li>
            <li>
              Aesthetic variations in solid wood — grain pattern, color, and
              knot character are features of natural wood, not defects
            </li>
          </ul>
        </section>

        <section aria-labelledby="warranty-transfer" className="space-y-4">
          <h2
            id="warranty-transfer"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            Transferability
          </h2>
          <p className="leading-relaxed">
            The warranty applies to the original purchaser and is not
            transferable. Please hold onto your order confirmation — it&apos;s the
            proof of purchase we need to honor a claim. We can often look up
            orders by name and date if you&apos;ve lost the email.
          </p>
        </section>

        <section aria-labelledby="warranty-faq" className="space-y-6">
          <h2
            id="warranty-faq"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            Common warranty questions
          </h2>
          <dl className="space-y-5">
            {WARRANTY_FAQS.map(({ q, a }) => (
              <div key={q} className="space-y-1">
                <dt className="font-semibold leading-snug">{q}</dt>
                <dd className="leading-relaxed text-cf-muted">{a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="warranty-claim" className="space-y-4">
          <h2
            id="warranty-claim"
            className="font-playfair text-2xl font-semibold tracking-tight"
          >
            Filing a claim
          </h2>
          <p className="leading-relaxed">
            Email{" "}
            <a
              href={BUSINESS.emailHref}
              className="text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
            >
              {BUSINESS.email}
            </a>{" "}
            with your order number, a description of the issue, and photos if
            you can. We&apos;ll respond within one business day and walk you through
            the next step. You can also reach us by phone at{" "}
            <a
              href={BUSINESS.phoneHref}
              className="text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
            >
              {BUSINESS.phone}
            </a>
            . Also see our{" "}
            <a
              href="/returns"
              className="text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
            >
              returns policy
            </a>{" "}
            and{" "}
            <a
              href="/shipping"
              className="text-cf-cta underline decoration-cf-cta/40 underline-offset-4 hover:decoration-cf-cta"
            >
              shipping information
            </a>
            .
          </p>
        </section>
      </article>
    </main>
  );
}
