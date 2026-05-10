import type { Metadata } from "next";

// cfw-9yg: /gift-registry is the public landing where shoppers create their
// own registry — it's marketing-relevant, so we WANT it indexed. Layout
// exists to host metadata since the page is "use client". The token-bearing
// /gift-registry/[id] view overrides this with its own noindex layout.
export const metadata: Metadata = {
  title: "Gift Registry — Carolina Futons",
  description:
    "Build a Carolina Futons gift registry for your wedding, housewarming, or baby shower. Save the futons you love and share a link friends can shop.",
  openGraph: {
    title: "Gift Registry — Carolina Futons",
    description:
      "Build a Carolina Futons gift registry for your wedding, housewarming, or baby shower.",
    type: "website",
  },
};

export default function GiftRegistryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
