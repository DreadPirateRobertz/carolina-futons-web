// cfw-0nt: shared return-reason vocabulary. Single source of truth for
// the route's input validation, the helper's payload shape, and the
// future StartReturnForm dropdown options (cf-9k5 P1 part 2).
//
// WHY: mirrors the Wix backend's `VALID_REASONS` + `REASON_LABELS`
// constants from `~/gt/cfutons/src/backend/returnsService.web.js`. Wix
// admins running the moderation queue across both systems need the same
// reason vocabulary so a cfw-submitted return can be processed without a
// translation step.

/**
 * Closed enum of return reasons accepted by /api/returns/submit. Order
 * is the display order for the future form dropdown.
 */
export const VALID_REASONS = [
  "wrong_size",
  "wrong_color",
  "defective",
  "damaged_in_shipping",
  "not_as_described",
  "changed_mind",
  "found_better_price",
  "other",
] as const;

export type ReturnReason = (typeof VALID_REASONS)[number];

/**
 * Human-readable label per reason. Matches the Wix `REASON_LABELS`
 * constant so a cfw submission lands in the admin queue with the same
 * display string the admin already recognizes.
 */
export const REASON_LABELS: Record<ReturnReason, string> = {
  wrong_size: "Wrong size",
  wrong_color: "Wrong color/finish",
  defective: "Product defect",
  damaged_in_shipping: "Damaged in shipping",
  not_as_described: "Not as described",
  changed_mind: "Changed my mind",
  found_better_price: "Found a better price",
  other: "Other",
};

/**
 * Type guard for narrowing a raw string to ReturnReason.
 *
 * @param value Any unknown / user-supplied value.
 * @returns true iff `value` is one of the closed-enum reasons.
 *
 * WHY a guard instead of a cast: callers (the API route) accept JSON
 * bodies where `reason` is `unknown` — narrowing happens at the boundary
 * so the helper layer can rely on the type without a re-check.
 */
export function isValidReason(value: unknown): value is ReturnReason {
  return (
    typeof value === "string" &&
    (VALID_REASONS as readonly string[]).includes(value)
  );
}
