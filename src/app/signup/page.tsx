import type { Metadata } from "next";

import { SignUpForm } from "@/components/account/SignUpForm";
import { DEFAULT_OG_IMAGE } from "@/lib/og";

const TITLE = "Create Account — Carolina Futons";
const DESCRIPTION =
  "Create a Carolina Futons account to save your wishlist, track orders, and manage preferences.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function SignUpPage() {
  return <SignUpForm />;
}
