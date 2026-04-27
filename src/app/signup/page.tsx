import type { Metadata } from "next";

import { SignUpForm } from "@/components/account/SignUpForm";

export const metadata: Metadata = {
  title: "Create Account — Carolina Futons",
  description:
    "Create a Carolina Futons account to save your wishlist, track orders, and manage preferences.",
};

export default function SignUpPage() {
  return <SignUpForm />;
}
