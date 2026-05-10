import type { Metadata } from "next";

// cfw-9yg: /cart is a transient checkout surface — no SEO value in indexing
// the empty/loading state, and the populated state is per-session. Mark
// noindex so crawlers don't burn budget on the route. Layout exists only
// to host metadata since cart/page.tsx is "use client" and cannot export it.
export const metadata: Metadata = {
  title: "Cart — Carolina Futons",
  robots: { index: false, follow: false },
};

export default function CartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
