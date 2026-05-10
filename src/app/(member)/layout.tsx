import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMemberSession } from "@/lib/auth/member";

// getMemberSession reads cookies at request time — static generation would
// produce a session-less render and incorrectly redirect every visitor.
export const dynamic = "force-dynamic";

// cfw-9yg: dashboard sub-routes are session-gated and uninteresting to
// crawlers — explicit noindex prevents wasted crawl budget on the redirect
// to /account that bots would hit. Each child page inherits this unless
// it overrides metadata itself.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getMemberSession();
  if (!session) redirect("/account?next=/dashboard");
  return <>{children}</>;
}
