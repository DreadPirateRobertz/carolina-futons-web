import { DashboardShell } from "@/components/member/DashboardShell";
import { LogoutButton } from "@/components/member/LogoutButton";
import { getMemberSession } from "@/lib/auth/member";
import { getWixClientWithTokens } from "@/lib/wix-client";

export const dynamic = "force-dynamic";

function formatJoinDate(raw: unknown): string | null {
  if (typeof raw !== "string" && !(raw instanceof Date)) return null;
  const d = new Date(raw as string);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function DashboardProfilePage() {
  const session = await getMemberSession();
  // Layout enforces the redirect; this narrow keeps TS happy and double-guards
  // against a misconfigured deploy serving the page without the layout.
  if (!session) return null;

  const client = getWixClientWithTokens(session.tokens);
  const { member } = await client.members.getCurrentMember();
  const fullName = [member?.contact?.firstName, member?.contact?.lastName]
    .filter(Boolean)
    .join(" ");
  const memberName = member?.profile?.nickname ?? (fullName || null);
  const memberEmail = member?.loginEmail ?? null;
  const joinDate = formatJoinDate(member?._createdDate);

  return (
    <DashboardShell
      memberId={session.memberId}
      memberName={memberName}
      memberEmail={memberEmail}
      activeTab="profile"
    >
      <section
        aria-labelledby="dashboard-profile-heading"
        data-slot="dashboard-profile"
        className="space-y-8"
      >
        <header>
          <h2
            id="dashboard-profile-heading"
            className="font-heading text-xl font-semibold text-cf-ink"
          >
            Profile
          </h2>
          <p className="mt-1 text-sm text-cf-muted">
            Your account details.
          </p>
        </header>

        <dl
          data-slot="profile-details"
          className="divide-y divide-cf-divider rounded-lg border border-cf-divider bg-white dark:bg-cf-cream"
        >
          <ProfileRow label="Name" value={memberName} />
          <ProfileRow label="Email" value={memberEmail} />
          {joinDate ? <ProfileRow label="Member since" value={joinDate} /> : null}
        </dl>

        <div className="border-t border-cf-divider pt-6">
          <p className="mb-3 text-sm text-cf-muted">
            Sign out of your account on this device.
          </p>
          <LogoutButton />
        </div>
      </section>
    </DashboardShell>
  );
}

function ProfileRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-baseline gap-4 px-5 py-4">
      <dt className="w-32 shrink-0 text-xs font-medium uppercase tracking-wide text-cf-muted">
        {label}
      </dt>
      <dd className="text-sm text-cf-ink">{value ?? "—"}</dd>
    </div>
  );
}
