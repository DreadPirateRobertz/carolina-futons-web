import Link from "next/link";

export type DashboardTabKey =
  | "overview"
  | "orders"
  | "wishlist"
  | "addresses"
  | "profile"
  | "preferences";

export type DashboardTab = {
  key: DashboardTabKey;
  href: string;
  label: string;
};

export const DASHBOARD_TABS: readonly DashboardTab[] = [
  { key: "overview", href: "/dashboard", label: "Overview" },
  { key: "orders", href: "/dashboard/orders", label: "Orders" },
  { key: "wishlist", href: "/dashboard/wishlist", label: "Wishlist" },
  // cf-dmos (cf-zn5b.2 G-9): saved-address management.
  { key: "addresses", href: "/dashboard/addresses", label: "Addresses" },
  { key: "profile", href: "/dashboard/profile", label: "Profile" },
  // cf-03e (cf-ruhm-w3.4): "Notifications" matches Wix prod's tab label;
  // the page-level H2 stays "Notification preferences" for the descriptive
  // sub-heading. Aligning the tab to shopper-familiar vocabulary.
  { key: "preferences", href: "/dashboard/preferences", label: "Notifications" },
] as const;

export type DashboardShellProps = {
  memberId: string;
  memberName: string | null;
  memberEmail: string | null;
  activeTab: DashboardTabKey;
  children: React.ReactNode;
};

export function DashboardShell({
  memberId,
  memberName,
  memberEmail,
  activeTab,
  children,
}: DashboardShellProps) {
  const displayName = memberName?.trim() || memberEmail || "Member";
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header
        data-slot="member-dashboard-header"
        className="mb-8 flex flex-col gap-2 border-b border-cf-divider pb-6"
      >
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-cf-cta">
          My account
        </p>
        <h1 className="text-2xl font-semibold text-cf-ink sm:text-3xl">
          Welcome back, {displayName}
        </h1>
        {memberEmail ? (
          <p className="text-sm text-cf-muted">{memberEmail}</p>
        ) : null}
      </header>

      <nav
        data-slot="member-dashboard-tabs"
        aria-label="Account sections"
        className="mb-8 flex flex-wrap gap-1 border-b border-cf-divider"
      >
        {DASHBOARD_TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              data-active={isActive ? "true" : "false"}
              className="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-cf-muted transition-colors hover:text-cf-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-cta focus-visible:ring-offset-2 rounded-t-sm data-[active=true]:border-cf-cta data-[active=true]:text-cf-ink"
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <section data-slot="member-dashboard-body" data-member-id={memberId}>
        {children}
      </section>
    </div>
  );
}
