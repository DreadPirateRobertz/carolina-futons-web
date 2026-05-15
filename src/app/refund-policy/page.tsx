import { permanentRedirect } from "next/navigation";

// cfw-di0: /refund-policy was a live-site URL on Wix Studio
// (src/pages/Refund Policy.js in the cfutons monorepo). The cf-3qt
// migration consolidated refund / return policy copy under /returns,
// but the legacy URL wasn't rerouted — inbound links from email and
// external sources were 404ing. Issue a 308 so cache/crawler link
// equity consolidates onto /returns. Mirrors the /our-story → /about
// pattern (cfw-g6e).
export default function RefundPolicyPage() {
  permanentRedirect("/returns");
}
