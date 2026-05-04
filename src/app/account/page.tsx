import type { Metadata } from "next";

import { AccountSignIn } from "@/components/account/AccountSignIn";

export const metadata: Metadata = {
  title: "Sign In — Carolina Futons",
  description:
    "Sign in to your Carolina Futons account to access your orders, wishlist, and preferences.",
};

// Server-component wrapper so Next.js can collect the metadata export. The
// interactive sign-in UI lives in AccountSignIn (client component) because
// it uses useState for form state and window.location.href for post-login
// navigation, neither of which are available in server components (cf-3qt.8.A.F1).
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <AccountSignIn next={next} />;
}
