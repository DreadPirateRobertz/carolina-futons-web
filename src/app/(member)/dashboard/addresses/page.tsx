import { DashboardShell } from "@/components/member/DashboardShell";
import { AddressList } from "@/components/member/AddressList";
import { getMyAddresses } from "@/app/actions/addresses";
import { getMemberSession } from "@/lib/auth/member";
import { getWixClientWithTokens } from "@/lib/wix-client";

export const dynamic = "force-dynamic";

// cf-dmos (cf-zn5b.2 G-9): saved-address management page. Matches the
// Wix Velo Member Page's initAddressBook (line 1464) which managed
// saved shipping addresses with add/edit/delete. The default-address
// selector documented in the cf-mbrflow-1 audit is V1-deferred — Wix
// Headless members.contact.addresses doesn't expose a "default" flag
// on the address itself; the convention is to put the default first
// in the array (cf-mbrflow-1 G-9 fu1).
export default async function DashboardAddressesPage() {
  const session = await getMemberSession();
  // Layout enforces the redirect; this narrow keeps TS happy and
  // double-guards against a misconfigured deploy.
  if (!session) return null;

  const client = getWixClientWithTokens(session.tokens);
  const { member } = await client.members.getCurrentMember();
  const fullName = [member?.contact?.firstName, member?.contact?.lastName]
    .filter(Boolean)
    .join(" ");
  const memberName = member?.profile?.nickname ?? (fullName || null);
  const memberEmail = member?.loginEmail ?? null;

  const result = await getMyAddresses();
  const addresses = result.ok ? result.addresses : [];

  return (
    <DashboardShell
      memberId={session.memberId}
      memberName={memberName}
      memberEmail={memberEmail}
      activeTab="addresses"
    >
      <section
        aria-labelledby="dashboard-addresses-heading"
        data-slot="dashboard-addresses"
        className="space-y-6"
      >
        <header>
          <h2
            id="dashboard-addresses-heading"
            className="font-heading text-xl font-semibold text-cf-ink"
          >
            Saved addresses
          </h2>
          <p className="mt-1 text-sm text-cf-muted">
            Your saved shipping addresses pre-fill at checkout so you can
            order in fewer clicks.
          </p>
        </header>

        {!result.ok ? (
          <p
            role="alert"
            data-testid="dashboard-addresses-fetch-error"
            className="text-sm text-red-600"
          >
            We couldn&rsquo;t load your saved addresses right now. Reload
            the page or add a new one below.
          </p>
        ) : null}

        <AddressList initial={addresses} />
      </section>
    </DashboardShell>
  );
}
