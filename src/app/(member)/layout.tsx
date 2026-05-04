import { redirect } from "next/navigation";
import { getMemberSession } from "@/lib/auth/member";

// getMemberSession reads cookies at request time — static generation would
// produce a session-less render and incorrectly redirect every visitor.
export const dynamic = "force-dynamic";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getMemberSession();
  if (!session) redirect("/account?next=/dashboard");
  return <>{children}</>;
}
