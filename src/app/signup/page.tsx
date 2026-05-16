import type { Metadata } from "next";

import { SignUpForm } from "@/components/account/SignUpForm";
import { DEFAULT_OG_IMAGE } from "@/lib/og";
import { twitterFromOpenGraph } from "@/lib/seo/twitter-from-og";

const TITLE = "Create Account — Carolina Futons";
const DESCRIPTION =
  "Create a Carolina Futons account to save your wishlist, track orders, and manage preferences.";

const OG = {
  title: TITLE,
  description: DESCRIPTION,
  images: [DEFAULT_OG_IMAGE],
};

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: OG,
  // cf-2qxr: per-page twitter card mirror.
  twitter: twitterFromOpenGraph(OG),
};

export default function SignUpPage() {
  return <SignUpForm />;
}
