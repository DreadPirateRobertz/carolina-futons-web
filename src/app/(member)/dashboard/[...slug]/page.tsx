import Link from "next/link";
import { DashboardShell, DASHBOARD_TABS, type DashboardTabKey } from "@/components/member/DashboardShell";
import { getMemberSession } from "@/lib/auth/member";
import { getWixClientWithTokens } from "@/lib/wix-client";

export const dynamic = "force-dynamic";

const KNOWN_TABS = new Set<DashboardTabKey>(
  DASHBOARD_TABS.filter((t) => t.key !== "overview").map((t) => t.key),
);

function resolveTab(slug: string[] | undefined): DashboardTabKey {
  const first = slug?.[0];
  if (first && (KNOWN_TABS as Set<string>).has(first)) {
    return first as DashboardTabKey;
  }
  return "overview";
}

export default async function DashboardCatchAllPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const session = await getMemberSession();
  if (!session) return null;

  const { slug } = await params;
  const activeTab = resolveTab(slug);

  const client = getWixClientWithTokens(session.tokens);
  const { member } = await client.members.getCurrentMember();
  const fullName = [member?.contact?.firstName, member?.contact?.lastName]
    .filter(Boolean)
    .join(" ");
  const memberName = member?.profile?.nickname ?? (fullName || null);
  const memberEmail = member?.loginEmail ?? null;

  return (
    <DashboardShell
      memberId={session.memberId}
      memberName={memberName}
      memberEmail={memberEmail}
      activeTab={activeTab}
    >
      <section className="rounded-lg border border-cf-divider bg-white p-8 text-center dark:bg-cf-cream">
        <h2 className="mb-2 text-lg font-semibold text-cf-ink">
          Coming soon
        </h2>
        <p className="mb-4 text-sm text-cf-muted">
          This section of your account is still being built. Check back soon.
        </p>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-cf-cta hover:underline"
        >
          Back to overview &rarr;
        </Link>
      </section>
    </DashboardShell>
  );
}
