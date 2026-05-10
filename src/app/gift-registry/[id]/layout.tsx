import type { Metadata } from "next";

// cfw-9yg: /gift-registry/[id] URLs are token-bearing — the [id] is the
// shareable handle that anyone with the link can view. Marking noindex
// prevents the URL from ending up in search results via referrer leak
// or accidental link sharing. Overrides the parent /gift-registry layout
// (which is index OK for the public landing).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function GiftRegistryViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
