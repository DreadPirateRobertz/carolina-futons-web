// Named error-ID constants for logError call sites.
// Centralising them here lets grep find every place an error is logged and
// makes the Sentry issue title stable across refactors.
//
// Convention: "<domain>:<operation>-<outcome>"
// Add new constants here before wiring a new logError call site.

export const QA_INSERT_FAILED = "qa:insert-question-failed";
export const QA_REVALIDATE_FAILED = "qa:revalidate-tag-failed";
export const QA_LIST_FAILED = "qa:list-questions-failed";
