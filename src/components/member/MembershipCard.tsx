import type { MemberPerksResult } from "@/app/actions/membership";

type Props = {
  data: MemberPerksResult;
};

export function MembershipCard({ data }: Props) {
  if (!data.success) {
    return (
      <article
        data-slot="membership-card"
        className="rounded-lg border border-cf-divider bg-white p-6 dark:bg-cf-cream"
      >
        <h2 className="mb-1 text-lg font-semibold text-cf-ink">CF+ Membership</h2>
        <p className="text-sm text-cf-muted">Could not load membership data.</p>
      </article>
    );
  }

  const {
    currentTierName,
    totalPoints,
    nextTierName,
    nextTierPointsNeeded,
    unlockedPerks,
  } = data;

  const progressPct =
    nextTierPointsNeeded && nextTierPointsNeeded > 0
      ? Math.min(
          100,
          Math.round(
            ((nextTierPointsNeeded - Math.max(0, nextTierPointsNeeded - totalPoints)) /
              nextTierPointsNeeded) *
              100,
          ),
        )
      : 100;

  return (
    <article
      data-slot="membership-card"
      className="rounded-lg border border-cf-divider bg-white p-6 dark:bg-cf-cream"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-cf-ink">CF+ Membership</h2>
          <p className="mt-0.5 text-sm font-medium text-cf-cta">{currentTierName}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums text-cf-ink">
            {totalPoints.toLocaleString()}
          </p>
          <p className="text-xs text-cf-muted">points</p>
        </div>
      </div>

      {nextTierName && nextTierPointsNeeded != null && (
        <div className="mb-4">
          <div className="mb-1 flex justify-between text-xs text-cf-muted">
            <span>
              {nextTierPointsNeeded - totalPoints > 0
                ? `${(nextTierPointsNeeded - totalPoints).toLocaleString()} pts to ${nextTierName}`
                : `${nextTierName} unlocked`}
            </span>
            <span>{progressPct}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progress toward ${nextTierName}`}
            className="h-1.5 w-full overflow-hidden rounded-full bg-cf-sand"
          >
            <div
              className="h-full rounded-full bg-cf-cta transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {unlockedPerks.length > 0 && (
        <ul className="space-y-1.5" aria-label="Unlocked perks">
          {unlockedPerks.slice(0, 3).map((perk) => (
            <li key={perk.perkId} className="flex items-center gap-2 text-sm text-cf-ink">
              <span aria-hidden="true">{perk.icon}</span>
              <span>{perk.label}</span>
            </li>
          ))}
          {unlockedPerks.length > 3 && (
            <li className="text-xs text-cf-muted">
              +{unlockedPerks.length - 3} more perks unlocked
            </li>
          )}
        </ul>
      )}
    </article>
  );
}
