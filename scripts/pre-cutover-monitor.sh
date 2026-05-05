#!/usr/bin/env bash
# pre-cutover-monitor.sh — cf-3qt.8 synthetic monitoring
#
# Checks 10 critical carolinafutons.com URLs every 60 seconds and logs results.
# Run this for 24h starting at DNS cutover. Kill with Ctrl-C when satisfied.
#
# Usage:
#   bash scripts/pre-cutover-monitor.sh [BASE_URL] [LOG_FILE]
#
# Defaults:
#   BASE_URL  = https://www.carolinafutons.com
#   LOG_FILE  = /tmp/cf-cutover-monitor-$(date +%Y%m%d-%H%M%S).log
#
# Requirements: curl, date (macOS or Linux), tee

set -euo pipefail

BASE_URL="${1:-https://www.carolinafutons.com}"
LOG_FILE="${2:-/tmp/cf-cutover-monitor-$(date +%Y%m%d-%H%M%S).log}"
INTERVAL=60   # seconds between full sweeps
TIMEOUT=10    # curl connect+max-time per URL

# 10 critical URLs — covers: home, all 4 PLPs, a PDP, cart, contact, shipping, returns
CRITICAL_PATHS=(
  "/"
  "/shop/futon-frames"
  "/shop/murphy-cabinet-beds"
  "/shop/platform-beds"
  "/shop/mattresses"
  "/products/kingston-futon-frame"
  "/cart"
  "/contact"
  "/shipping"
  "/returns"
)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
  echo -e "$msg" | tee -a "$LOG_FILE"
}

check_url() {
  local url="$1"
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" \
    --connect-timeout "$TIMEOUT" \
    --max-time "$TIMEOUT" \
    -L \
    "$url" 2>/dev/null || echo "000")
  echo "$http_code"
}

sweep() {
  local sweep_num="$1"
  local pass=0
  local fail=0

  log "── Sweep #${sweep_num} ──────────────────────────────────"

  for path in "${CRITICAL_PATHS[@]}"; do
    local url="${BASE_URL}${path}"
    local code
    code=$(check_url "$url")

    if [[ "$code" == "200" ]]; then
      log "${GREEN}OK   ${code}${NC}  ${path}"
      ((pass++))
    elif [[ "$code" =~ ^(301|302|307|308)$ ]]; then
      # Redirects are acceptable for some paths but flag them for awareness
      log "${YELLOW}RDIR ${code}${NC}  ${path}"
      ((pass++))
    else
      log "${RED}FAIL ${code}${NC}  ${path}"
      ((fail++))
    fi
  done

  local total=$(( pass + fail ))
  local pct=$(( pass * 100 / total ))
  log "Result: ${pass}/${total} OK (${pct}%)"

  if (( fail > 0 )); then
    log "${RED}⚠ WARNING: ${fail} URL(s) failing — check above. Error budget alert threshold: >5% over 5 min.${NC}"
  fi

  # Return 1 if ANY URL failed so callers can act on it
  (( fail == 0 ))
}

# ── main ──────────────────────────────────────────────────────────────────────

log "Starting pre-cutover synthetic monitor"
log "Target: ${BASE_URL}"
log "Log:    ${LOG_FILE}"
log "URLs:   ${#CRITICAL_PATHS[@]}"
log "Interval: ${INTERVAL}s"
log "Press Ctrl-C to stop."
echo ""

consecutive_failures=0
sweep_num=0

while true; do
  ((sweep_num++))
  if sweep "$sweep_num"; then
    consecutive_failures=0
  else
    ((consecutive_failures++))
    if (( consecutive_failures >= 3 )); then
      log "${RED}🚨 ROLLBACK TRIGGER: 3 consecutive sweeps with failures (${consecutive_failures}). Consult rollback-runbook.md.${NC}"
    fi
  fi

  log "Next sweep in ${INTERVAL}s…"
  sleep "$INTERVAL"
done
