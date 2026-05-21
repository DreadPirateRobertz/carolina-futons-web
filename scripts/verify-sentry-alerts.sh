#!/usr/bin/env bash
# verify-sentry-alerts.sh — cf-czdw.fu2
#
# Fetches active Sentry metric alert rules for the cfw project and validates
# them against the 4 thresholds documented in
# docs/runbooks/sentry-isr-alert-spec.md section 6.
#
# Exits 0 when all 4 rules are present and match spec. Exits 1 on drift
# (missing rule or wrong threshold). Exits 2 on setup error (missing env
# vars, API unreachable, jq not installed).
#
# Usage:
#   SENTRY_AUTH_TOKEN=... SENTRY_ORG=... SENTRY_PROJECT=... \
#     bash scripts/verify-sentry-alerts.sh
#
# Environment:
#   SENTRY_AUTH_TOKEN  required — org-level Sentry auth token
#   SENTRY_ORG         required — Sentry organization slug
#   SENTRY_PROJECT     required — cfw Sentry project slug
#   SENTRY_HOST        optional — default https://sentry.io
#
# Exit codes:
#   0  all 4 rules present and match spec thresholds
#   1  one or more rules missing or thresholds drifted from spec
#   2  setup error (missing env var, API error, jq unavailable)

set -euo pipefail

# ── Prerequisites ────────────────────────────────────────────────────────────

if ! command -v jq &>/dev/null; then
  echo "ERROR: jq is required but not installed." >&2
  exit 2
fi

: "${SENTRY_AUTH_TOKEN:?SENTRY_AUTH_TOKEN is required}"
: "${SENTRY_ORG:?SENTRY_ORG is required}"
: "${SENTRY_PROJECT:?SENTRY_PROJECT is required}"

SENTRY_HOST="${SENTRY_HOST:-https://sentry.io}"
API_BASE="${SENTRY_HOST}/api/0/organizations/${SENTRY_ORG}"

# ── Fetch alert rules ────────────────────────────────────────────────────────

echo "Fetching metric alert rules for project '${SENTRY_PROJECT}' from ${SENTRY_HOST}…"

HTTP_RESPONSE=$(curl -sf \
  -H "Authorization: Bearer ${SENTRY_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  "${API_BASE}/alert-rules/?project=${SENTRY_PROJECT}&per_page=100" \
  -w "\n%{http_code}" 2>&1) || {
  echo "ERROR: curl failed — Sentry API unreachable or auth rejected." >&2
  exit 2
}

HTTP_BODY=$(echo "$HTTP_RESPONSE" | head -n -1)
HTTP_STATUS=$(echo "$HTTP_RESPONSE" | tail -n 1)

if [[ "$HTTP_STATUS" != "200" ]]; then
  echo "ERROR: Sentry API returned HTTP ${HTTP_STATUS}." >&2
  echo "Response: ${HTTP_BODY}" >&2
  exit 2
fi

RULES="$HTTP_BODY"
RULE_COUNT=$(echo "$RULES" | jq 'length')
echo "Found ${RULE_COUNT} metric alert rule(s)."
echo ""

# ── Rule-check helper ─────────────────────────────────────────────────────────
#
# check_rule DESCRIPTION QUERY_REGEX TRIGGER_LABEL THRESHOLD TIME_WINDOW_MIN
#
# Scans the fetched rules for one that satisfies all five criteria. Prints
# PASS (with the matching rule name) or FAIL. Returns 0/1 accordingly.

FAILURES=0

check_rule() {
  local description="$1"
  local query_pattern="$2"   # case-insensitive regex matched against rule.query
  local trigger_label="$3"   # "warning" or "critical"
  local threshold="$4"       # integer alertThreshold
  local time_window="$5"     # integer minutes

  local match
  match=$(echo "$RULES" | jq -r \
    --arg pat "$query_pattern" \
    --arg trig "$trigger_label" \
    --argjson thresh "$threshold" \
    --argjson tw "$time_window" \
    '[.[] | select(
       .query != null and
       (.query | test($pat; "i")) and
       .timeWindow == $tw and
       (.triggers | any(.label == $trig and .alertThreshold == $thresh))
     ) | .name] | first // empty')

  if [[ -n "$match" ]]; then
    printf "  ✓ PASS  %-55s  (rule: %s)\n" "$description" "$match"
    return 0
  else
    printf "  ✗ FAIL  %s\n" "$description"
    printf "         Expected: query~/%s/, trigger=%s, threshold=%s, window=%sm\n" \
      "$query_pattern" "$trigger_label" "$threshold" "$time_window"
    FAILURES=$(( FAILURES + 1 ))
    return 1
  fi
}

# ── Validate the 4 spec rules (sentry-isr-alert-spec.md §6) ──────────────────

echo "Checking 4 required alert rules (sentry-isr-alert-spec.md §6):"
echo ""

# Alert 1: ISR stale — warn at ≥3 errors/5min
check_rule \
  "ISR stale warn  (≥3 errors/5min → Slack)" \
  "stale" \
  "warning" \
  3 \
  5 || true

# Alert 2: ISR stale — page at ≥10 errors/5min
check_rule \
  "ISR stale page  (≥10 errors/5min → PagerDuty)" \
  "stale" \
  "critical" \
  10 \
  5 || true

# Alert 3: on-demand revalidation — warn at ≥1 error/5min
check_rule \
  "On-demand warn  (≥1 error/5min → Slack)" \
  "on-demand" \
  "warning" \
  1 \
  5 || true

# Alert 4: on-demand revalidation — page at ≥5 errors/5min
check_rule \
  "On-demand page  (≥5 errors/5min → PagerDuty)" \
  "on-demand" \
  "critical" \
  5 \
  5 || true

echo ""

# ── Result ───────────────────────────────────────────────────────────────────

if [[ "$FAILURES" -eq 0 ]]; then
  echo "PASS — all 4 alert rules present and match spec thresholds."
  exit 0
else
  echo "DRIFT DETECTED — ${FAILURES} rule(s) missing or thresholds do not match spec."
  echo ""
  echo "Remediation: configure the missing/drifted rules in Sentry →"
  echo "  ${SENTRY_HOST}/organizations/${SENTRY_ORG}/alerts/"
  echo "  Reference: docs/runbooks/sentry-isr-alert-spec.md section 6"
  exit 1
fi
