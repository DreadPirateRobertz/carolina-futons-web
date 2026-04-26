import { DashboardShell } from "@/components/member/DashboardShell";
import { PreferencesForm } from "@/components/member/PreferencesForm";
import {
  DEFAULT_PREFERENCES,
  getMyPushPreferences,
  type PreferenceMap,
} from "@/app/actions/preferences";
import { getMemberSession } from "@/lib/auth/member";
import { getWixClientWithTokens } from "@/lib/wix-client";

export const dynamic = "force-dynamic";

export default async function DashboardPreferencesPage() {
  const session = await getMemberSession();
  if (!session) return null;

  const client = getWixClientWithTokens(session.tokens);
  const { member } = await client.members.getCurrentMember();
  const fullName = [member?.contact?.firstName, member?.contact?.lastName]
    .filter(Boolean)
    .join(" ");
  const memberName = member?.profile?.nickname ?? (fullName || null);
  const memberEmail = member?.loginEmail ?? null;

  // managePushPreferences returns success:false on backend trouble — fall
  // back to DEFAULT_PREFERENCES so the form still renders editable. If
  // saving the form succeeds the user's choice will overwrite the default.
  const result = await getMyPushPreferences();
  const initial: PreferenceMap = result.success
    ? result.prefs
    : DEFAULT_PREFERENCES;

  return (
    <DashboardShell
      memberId={session.memberId}
      memberName={memberName}
      memberEmail={memberEmail}
      activeTab="preferences"
    >
      <section
        aria-labelledby="dashboard-preferences-heading"
        data-slot="dashboard-preferences"
        className="space-y-6"
      >
        <header>
          <h2
            id="dashboard-preferences-heading"
            className="font-heading text-xl font-semibold text-cf-ink"
          >
            Notification preferences
          </h2>
          <p className="mt-1 text-sm text-cf-muted">
            Choose what we send you. You can change these anytime.
          </p>
        </header>

        <PreferencesForm initial={initial} />
      </section>
    </DashboardShell>
  );
}
