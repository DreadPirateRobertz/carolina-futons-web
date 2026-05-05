import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/account/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password — Carolina Futons",
  description:
    "Reset your Carolina Futons account password. Enter your email and we'll send you a secure link.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
