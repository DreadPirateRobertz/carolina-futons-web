// cfw-coc: server-side log-PII redaction. Replace raw email / user-data
// log lines with a deterministic short hash so logs retain their dedupe
// value (rate-limit detection, "this user signed up twice" debugging)
// without persisting the underlying PII in Vercel/Datadog/Sumo retention.
//
// HMAC-SHA256 with a per-deploy salt (LOG_PII_SALT env var). Salt prevents
// rainbow-table attack against published log dumps; rotating the salt
// invalidates correlation across deploys, which is the desired property
// (logs from a year ago should not let you reverse a current email).
//
// Output is the 12-char hex prefix of the HMAC. 12 hex chars = 48 bits of
// entropy — collision probability is ~1 in 281 trillion at 1M distinct
// emails per deploy, which is far beyond newsletter/cross-rig log volume.
// Full 64-char hashes blow up log lines without adding useful precision.

import { createHmac } from "node:crypto";

import { logWarn } from "@/lib/observability/log";

const HASH_PREFIX_LENGTH = 12;
const FALLBACK_TOKEN = "<unsalted>";

let warnedNoSalt = false;

/**
 * Returns a stable short hash of `value` suitable for server logs.
 *
 * - Uses HMAC-SHA256 with `process.env.LOG_PII_SALT`.
 * - Returns `<unsalted>` (and warns once) if the salt is not configured —
 *   this surfaces the misconfiguration rather than silently producing an
 *   un-keyed hash that an attacker could rainbow-table.
 * - Stable across calls within a deploy: same input → same hash. Rate-limit
 *   detection and "duplicate subscriber" log lines still correlate.
 */
export function hashPii(value: string): string {
  const salt = process.env.LOG_PII_SALT;
  if (!salt) {
    if (!warnedNoSalt) {
      logWarn("log/hash-pii", "LOG_PII_SALT not set — PII redaction emitting <unsalted> placeholder");
      warnedNoSalt = true;
    }
    return FALLBACK_TOKEN;
  }
  return createHmac("sha256", salt)
    .update(value)
    .digest("hex")
    .slice(0, HASH_PREFIX_LENGTH);
}

/**
 * Convenience: hashes an email address. Lowercases first so
 * `User@Example.com` and `user@example.com` correlate in logs.
 */
export function hashEmail(email: string): string {
  return hashPii(email.toLowerCase().trim());
}
