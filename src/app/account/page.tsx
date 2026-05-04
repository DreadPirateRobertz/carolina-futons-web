import type { Metadata } from "next";

import { AccountSignIn } from "@/components/account/AccountSignIn";

export const metadata: Metadata = {
  title: "Sign In — Carolina Futons",
  description:
    "Sign in to your Carolina Futons account to access your orders, wishlist, and preferences.",
};

// Server-component wrapper so Next.js can collect the metadata export. The
// interactive sign-in UI lives in AccountSignIn (client component) because
// the OAuth redirect uses window.location.href (cf-3qt.8.A.F1).
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <AccountSignIn next={next} />;
}
