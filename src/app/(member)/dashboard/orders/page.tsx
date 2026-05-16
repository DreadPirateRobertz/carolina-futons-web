import Link from "next/link";

import { DashboardShell } from "@/components/member/DashboardShell";
import { OrderHistoryList } from "@/components/member/OrderHistoryList";
import { getMemberSession } from "@/lib/auth/member";
import { getWixClientWithTokens } from "@/lib/wix-client";
import { getOrdersForMember } from "@/lib/wix/orders";

export const dynamic = "force-dynamic";

export default async function DashboardOrdersPage() {
  const session = await getMemberSession();
  // Layout enforces the redirect; the narrow keeps TS happy and double-guards
  // against a misconfigured deploy serving the page without the layout.
  if (!session) return null;

  const client = getWixClientWithTokens(session.tokens);
  const { member } = await client.members.getCurrentMember();
  const fullName = [member?.contact?.firstName, member?.contact?.lastName]
    .filter(Boolean)
    .join(" ");
  const memberName = member?.profile?.nickname ?? (fullName || null);
  const memberEmail = member?.loginEmail ?? null;
  const contactId = member?.contactId ?? null;

  const orders = contactId
    ? await getOrdersForMember({ contactId, tokens: session.tokens })
    : [];

  return (
    <DashboardShell
      memberId={session.memberId}
      memberName={memberName}
      memberEmail={memberEmail}
      activeTab="orders"
    >
      <section
        aria-labelledby="dashboard-orders-heading"
        data-slot="dashboard-orders"
        className="space-y-6"
      >
        <header className="flex flex-wrap items-baseline justify-between gap-3">
          <h2
            id="dashboard-orders-heading"
            className="font-heading text-xl font-semibold text-cf-ink"
          >
            Your orders
          </h2>
          <Link
            href="/shop"
            className="text-sm font-medium text-cf-cta hover:underline"
          >
            Continue shopping &rarr;
          </Link>
        </header>

        {/* cf-fd94: pass memberEmail through so each FULFILLED row
            can render a Track-shipment Link to /track-order. */}
        <OrderHistoryList orders={orders} memberEmail={memberEmail} />
      </section>
    </DashboardShell>
  );
}
