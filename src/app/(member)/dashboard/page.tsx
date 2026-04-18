import { DashboardShell } from "@/components/member/DashboardShell";
import { getMemberSession } from "@/lib/auth/_member-session-stub";
import { getWixClientWithTokens } from "@/lib/wix-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getMemberSession();
  // Layout already enforces the redirect; this narrow keeps TS happy and
  // double-guards against a misconfigured deploy serving the page component
  // without the layout.
  if (!session) return null;

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
      activeTab="overview"
    >
      <section className="grid gap-6 md:grid-cols-2">
        <EmptyCard
          title="Recent orders"
          body="Your order history will show up here once you've placed your first order."
          ctaLabel="View all orders"
          ctaHref="/dashboard/orders"
        />
        <EmptyCard
          title="Wishlist"
          body="Save products you love and pick up where you left off later."
          ctaLabel="Open wishlist"
          ctaHref="/dashboard/wishlist"
        />
      </section>
    </DashboardShell>
  );
}

function EmptyCard({
  title,
  body,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <article className="rounded-lg border border-cf-divider bg-white p-6">
      <h2 className="mb-2 text-lg font-semibold text-cf-ink">{title}</h2>
      <p className="mb-4 text-sm text-cf-muted">{body}</p>
      <a
        href={ctaHref}
        className="text-sm font-medium text-cf-cta hover:underline"
      >
        {ctaLabel} &rarr;
      </a>
    </article>
  );
}
