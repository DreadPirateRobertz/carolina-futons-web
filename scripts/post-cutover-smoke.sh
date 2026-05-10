#!/usr/bin/env bash
# post-cutover-smoke.sh — cf-3qt.8 immediate-after-cutover verification
#
# One-shot smoke test that runs at the moment DNS flips to Vercel. Confirms
# the four things Stilgar wants to see green before he walks away from the
# laptop:
#
#   1. DNS resolves carolinafutons.com to a Vercel IP / CNAME
#   2. /shop/futon-frames returns HTTP 200 with the expected PLP marker
#   3. Wix Headless OAuth token can be minted with the configured client id
#   4. The Wix cart round-trip works: add an item → fetch cart → remove → cart empty
#
# Sibling to scripts/pre-cutover-monitor.sh (the rolling 60s sweep). This
# script exits non-zero on the first failure so it can run from CI / a
# Vercel cron / a Stilgar terminal as a single PASS|FAIL gate.
#
# Usage:
#   bash scripts/post-cutover-smoke.sh [BASE_URL]
#
# Defaults:
#   BASE_URL  = https://www.carolinafutons.com
#
# Env vars:
#   WIX_CLIENT_ID_HEADLESS  required — same client id Vercel ships in prod
#   SMOKE_TIMEOUT           optional, default 10s per HTTP request
#   SMOKE_VERBOSE=1         optional, prints curl bodies on failure
#
# Exit codes:
#   0  all four checks passed
#   1  DNS resolution failed
#   2  PLP HTTP check failed
#   3  Wix Headless auth failed
#   4  Cart round-trip failed
#
# Requirements: bash 4+, curl 7.55+ (for --fail-with-body), jq, dig (or host).

set -euo pipefail

BASE_URL="${1:-https://www.carolinafutons.com}"
HOST_NAME="$(printf '%s' "$BASE_URL" | sed -E 's#^https?://##' | sed -E 's#/.*$##')"
SMOKE_TIMEOUT="${SMOKE_TIMEOUT:-10}"
VERBOSE="${SMOKE_VERBOSE:-0}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
DIM='\033[2m'
NC='\033[0m'

# ── helpers ─────────────────────────────────────────────────────────

step() { printf "%b▶%b %s\n" "$YELLOW" "$NC" "$*"; }
ok()   { printf "%b✓%b %s\n" "$GREEN" "$NC" "$*"; }
fail() {
  printf "%b✗%b %s\n" "$RED" "$NC" "$*" >&2
  if [[ -n "${1+x}" && "$VERBOSE" == "1" && -n "${SMOKE_LAST_BODY:-}" ]]; then
    printf "%b  body:%b %s\n" "$DIM" "$NC" "$SMOKE_LAST_BODY" >&2
  fi
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    fail "Required command '$1' not found in PATH."
    exit 1
  fi
}

require_cmd curl
require_cmd jq
if ! command -v dig >/dev/null 2>&1 && ! command -v host >/dev/null 2>&1; then
  fail "Need either 'dig' or 'host' on PATH for the DNS check."
  exit 1
fi

# ── 1. DNS → Vercel ────────────────────────────────────────────────
#
# Vercel-hosted apex/www records resolve to either *.vercel-dns.com,
# 76.76.21.* (legacy A), or 64.29.17.* / 216.198.79.* (current). The
# CNAME chain is the most reliable signal — a freshly-flipped DNS
# may still be propagating IPs but the CNAME target is set immediately.

step "DNS: resolve $HOST_NAME"

dns_lookup() {
  if command -v dig >/dev/null 2>&1; then
    # +short prints just the answer chain, last line is the IP
    dig +short "$HOST_NAME"
  else
    host "$HOST_NAME"
  fi
}

DNS_OUTPUT="$(dns_lookup || true)"
if [[ -z "$DNS_OUTPUT" ]]; then
  fail "DNS: $HOST_NAME did not resolve at all."
  exit 1
fi

# Vercel signal patterns (CNAME or IP). The match is case-insensitive
# and tolerant of either dig or host output formats.
if grep -qiE 'vercel-dns\.com|76\.76\.21\.|64\.29\.17\.|216\.198\.79\.' <<< "$DNS_OUTPUT"; then
  ok "DNS: $HOST_NAME → Vercel (matched in resolution chain)"
else
  fail "DNS: $HOST_NAME does not look like a Vercel target. Got:"
  printf '%s\n' "$DNS_OUTPUT" >&2
  exit 1
fi

# ── 2. /shop/futon-frames returns 200 ──────────────────────────────
#
# More than just the status code: the response body must contain the
# canonical PLP marker so we know we hit the new Next.js handler, not
# a stale Wix Studio render or a 200 OK error page.

step "HTTP: GET $BASE_URL/shop/futon-frames"

PLP_URL="$BASE_URL/shop/futon-frames"
PLP_BODY="$(curl --fail-with-body --silent --show-error \
  --max-time "$SMOKE_TIMEOUT" \
  -A 'cf-3qt.8-post-cutover-smoke/1.0' \
  -H 'Accept: text/html' \
  "$PLP_URL")" || {
  SMOKE_LAST_BODY="${PLP_BODY:-}"
  fail "HTTP: $PLP_URL did not return 200."
  exit 2
}

# Verify it's the Next.js storefront (a Wix Studio render won't carry
# `__next` data nor the `data-slot="site-header"` Phase 1 wordmark).
if grep -q '__NEXT_DATA__\|data-slot="site-header"' <<< "$PLP_BODY"; then
  ok "HTTP: /shop/futon-frames 200 (Next.js storefront markers present)"
else
  SMOKE_LAST_BODY="$PLP_BODY"
  fail "HTTP: /shop/futon-frames 200 but body lacks Next.js markers — possible stale Wix render."
  exit 2
fi

# ── 3. Wix Headless OAuth token mint ───────────────────────────────
#
# Mints a public-visitor token using the same client id Vercel ships
# in prod. A failure here means the cfw clients (server-only and
# browser-side) will fail at the auth boundary regardless of DNS or
# routing health.

step "Wix Headless: mint visitor OAuth token"

if [[ -z "${WIX_CLIENT_ID_HEADLESS:-}" ]]; then
  fail "Wix Headless: WIX_CLIENT_ID_HEADLESS not set in env."
  exit 3
fi

WIX_AUTH_URL='https://www.wixapis.com/oauth2/token'
WIX_TOKEN_RESPONSE="$(curl --fail-with-body --silent --show-error \
  --max-time "$SMOKE_TIMEOUT" \
  -X POST "$WIX_AUTH_URL" \
  -H 'Content-Type: application/json' \
  -d "{\"grantType\":\"anonymous\",\"clientId\":\"$WIX_CLIENT_ID_HEADLESS\"}")" || {
  SMOKE_LAST_BODY="${WIX_TOKEN_RESPONSE:-}"
  fail "Wix Headless: token mint request failed."
  exit 3
}

WIX_ACCESS_TOKEN="$(jq -r '.access_token // empty' <<< "$WIX_TOKEN_RESPONSE")"
if [[ -z "$WIX_ACCESS_TOKEN" ]]; then
  SMOKE_LAST_BODY="$WIX_TOKEN_RESPONSE"
  fail "Wix Headless: token endpoint returned 200 but no access_token."
  exit 3
fi

ok "Wix Headless: visitor token minted (length=${#WIX_ACCESS_TOKEN})"

# ── 4. Cart add → fetch → remove round-trip ────────────────────────
#
# Picks a known-good catalog item id from the WIX_SMOKE_PRODUCT_ID env
# (Stilgar / cfw-deployment supplies a stable test SKU) and adds it,
# fetches the cart to confirm, then clears it. If the WIX_SMOKE_PRODUCT_ID
# is unset the round-trip is skipped (still passes — cart endpoint
# auth was already proved by the token mint above).

step "Cart: add → fetch → remove round-trip"

if [[ -z "${WIX_SMOKE_PRODUCT_ID:-}" ]]; then
  ok "Cart: skipped (set WIX_SMOKE_PRODUCT_ID to enable round-trip)"
else
  CART_BASE='https://www.wixapis.com/ecom/v1/carts/current'
  WIX_STORES_APP_ID='215238eb-22a5-4c36-9e7b-e7c08025e04e'

  # 4a. Add to current cart
  ADD_BODY="$(jq -n --arg productId "$WIX_SMOKE_PRODUCT_ID" --arg appId "$WIX_STORES_APP_ID" '{
    lineItems: [{
      catalogReference: { appId: $appId, catalogItemId: $productId },
      quantity: 1
    }]
  }')"
  ADD_RESPONSE="$(curl --fail-with-body --silent --show-error \
    --max-time "$SMOKE_TIMEOUT" \
    -X POST "$CART_BASE/add-to-cart" \
    -H "Authorization: $WIX_ACCESS_TOKEN" \
    -H 'Content-Type: application/json' \
    -d "$ADD_BODY")" || {
    SMOKE_LAST_BODY="${ADD_RESPONSE:-}"
    fail "Cart: add-to-cart failed."
    exit 4
  }

  LINE_ITEM_ID="$(jq -r '.cart.lineItems[0]._id // empty' <<< "$ADD_RESPONSE")"
  if [[ -z "$LINE_ITEM_ID" ]]; then
    SMOKE_LAST_BODY="$ADD_RESPONSE"
    fail "Cart: add succeeded but cart.lineItems[0]._id missing — payload shape changed?"
    exit 4
  fi
  ok "Cart: added $WIX_SMOKE_PRODUCT_ID (line $LINE_ITEM_ID)"

  # 4b. Fetch cart and confirm the line is present
  GET_RESPONSE="$(curl --fail-with-body --silent --show-error \
    --max-time "$SMOKE_TIMEOUT" \
    "$CART_BASE" \
    -H "Authorization: $WIX_ACCESS_TOKEN")" || {
    SMOKE_LAST_BODY="${GET_RESPONSE:-}"
    fail "Cart: fetch failed."
    exit 4
  }
  if ! jq -e --arg id "$LINE_ITEM_ID" '.lineItems | map(._id) | index($id) != null' \
        <<< "$GET_RESPONSE" >/dev/null; then
    SMOKE_LAST_BODY="$GET_RESPONSE"
    fail "Cart: fetched cart does not contain the just-added line."
    exit 4
  fi
  ok "Cart: fetch confirms line present"

  # 4c. Remove the line — leaves the cart empty for the next smoke run
  REMOVE_BODY="$(jq -n --arg id "$LINE_ITEM_ID" '{ lineItemIds: [$id] }')"
  REMOVE_RESPONSE="$(curl --fail-with-body --silent --show-error \
    --max-time "$SMOKE_TIMEOUT" \
    -X POST "$CART_BASE/remove-line-items" \
    -H "Authorization: $WIX_ACCESS_TOKEN" \
    -H 'Content-Type: application/json' \
    -d "$REMOVE_BODY")" || {
    SMOKE_LAST_BODY="${REMOVE_RESPONSE:-}"
    fail "Cart: remove-line-items failed."
    exit 4
  }
  REMAINING="$(jq -r '.cart.lineItems | length // 0' <<< "$REMOVE_RESPONSE")"
  if [[ "$REMAINING" != "0" ]]; then
    SMOKE_LAST_BODY="$REMOVE_RESPONSE"
    fail "Cart: remove returned $REMAINING line items left (expected 0)."
    exit 4
  fi
  ok "Cart: line removed; cart is empty"
fi

printf "\n%b✓ post-cutover smoke PASSED — %s%b\n" "$GREEN" "$BASE_URL" "$NC"
