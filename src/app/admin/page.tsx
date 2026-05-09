import Link from "next/link";

// cfw-wef (cfw-6qd.1): /admin landing for owner mode. The layout has
// already enforced the `requireOwnerSession` gate, so reaching this
// component is sufficient proof the visitor is an allowlisted owner.
//
// This is a deliberately minimal placeholder. Sub-bead 2 (EditableText)
// adds the pencil-icon UI; sub-bead 3 wires the persistence endpoint;
// sub-bead 5 adds the image-upload affordance. For now the page just
// signals that the gate works — Brenda can confirm she can reach
// /admin and a non-owner cannot.

export default function AdminHomePage() {
  return (
    <section
      data-slot="admin-home"
      aria-labelledby="admin-home-heading"
      className="rounded-lg border border-cf-divider bg-white p-6 shadow-sm sm:p-8"
    >
      <h1
        id="admin-home-heading"
        className="font-heading text-2xl font-semibold text-cf-espresso"
      >
        Owner mode
      </h1>
      <p className="mt-3 text-cf-charcoal/80">
        You&rsquo;re signed in as a Carolina Futons site owner. Inline editing
        affordances will appear here as the next sub-beads ship; for now the
        gate itself is the deliverable.
      </p>

      <ul className="mt-6 space-y-2 text-sm text-cf-charcoal/70">
        <li>
          <span className="font-medium text-cf-espresso">Up next (cfw-6qd.2):</span>{" "}
          EditableText component — pencil affordance on every SiteContent string.
        </li>
        <li>
          <span className="font-medium text-cf-espresso">Up next (cfw-6qd.3):</span>{" "}
          POST /api/admin/site-content — persist Brenda&rsquo;s edits to Wix Data.
        </li>
      </ul>

      <p className="mt-6 text-sm">
        <Link href="/" className="text-cf-cta underline-offset-2 hover:underline">
          ← Back to the storefront
        </Link>
      </p>
    </section>
  );
}
