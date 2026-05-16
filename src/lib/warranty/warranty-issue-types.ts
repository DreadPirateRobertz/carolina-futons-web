// cfw-80n1: closed-enum vocabulary for warranty-claim issue types.
// Mirrored 1:1 from the Wix backend's VALID_ISSUE_TYPES constant in
// `~/gt/cfutons/src/backend/warrantyService.web.js` so the admin queue
// across both systems uses the same categorization for triage.

/**
 * Closed enum of warranty-claim issue types accepted by
 * /api/warranty/claim. Order is the display order for the future form
 * dropdown.
 */
export const VALID_ISSUE_TYPES = [
  "structural",
  "fabric",
  "mechanism",
  "accidental",
  "stain",
  "other",
] as const;

export type WarrantyIssueType = (typeof VALID_ISSUE_TYPES)[number];

/**
 * Human-readable labels per issue type. Matches Wix-side display so a
 * cfw submission lands in the admin queue with the same string.
 */
export const ISSUE_TYPE_LABELS: Record<WarrantyIssueType, string> = {
  structural: "Structural damage",
  fabric: "Fabric issue",
  mechanism: "Mechanism failure",
  accidental: "Accidental damage",
  stain: "Stain or discoloration",
  other: "Other",
};

/**
 * Type guard narrowing an unknown to WarrantyIssueType.
 *
 * @param value Any unknown / user-supplied value.
 * @returns true iff `value` is one of the closed-enum issue types.
 *
 * WHY a guard at the boundary: the API route accepts JSON bodies where
 * `issueType` is `unknown`; narrowing once at the boundary lets the
 * helper rely on the typed value without re-checking.
 */
export function isValidIssueType(value: unknown): value is WarrantyIssueType {
  return (
    typeof value === "string" &&
    (VALID_ISSUE_TYPES as readonly string[]).includes(value)
  );
}
