import { redirect } from "next/navigation";
import { getMemberSession } from "@/lib/auth/_member-session-stub";

export const dynamic = "force-dynamic";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getMemberSession();
  if (!session) redirect("/?auth_required=1");
  return <>{children}</>;
}
