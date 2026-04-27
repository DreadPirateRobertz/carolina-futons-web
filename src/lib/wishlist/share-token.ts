// cf-u89z: HMAC-SHA256 share token for /wishlist/[token] public views.
//
// Token format: base64url(memberId) + "." + base64url(HMAC-SHA256(memberId, secret))
// Stateless — no database column needed. Revocation requires rotating the secret.
// The Velo side (getWishlistByMemberId) enforces its own per-memberId rate limit
// as a second layer against brute-force enumeration.

import { createHmac, timingSafeEqual } from "node:crypto";

function b64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf8");
  return buf.toString("base64url");
}

function b64urlDecode(input: string): string | null {
  try {
    return Buffer.from(input, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export function signMemberId(memberId: string, secret: string): string {
  const sig = createHmac("sha256", secret).update(memberId).digest();
  return `${b64url(memberId)}.${b64url(sig)}`;
}

// Returns the memberId if the token is valid and signature matches, otherwise null.
export function verifyShareToken(token: string, secret: string): string | null {
  const dotIdx = token.indexOf(".");
  if (dotIdx === -1) return null;

  const encodedId = token.slice(0, dotIdx);
  const encodedSig = token.slice(dotIdx + 1);

  const memberId = b64urlDecode(encodedId);
  if (!memberId) return null;

  const expectedSig = createHmac("sha256", secret).update(memberId).digest();
  const actualSigBuf = Buffer.from(encodedSig, "base64url");

  if (actualSigBuf.length !== expectedSig.length) return null;

  try {
    if (!timingSafeEqual(actualSigBuf, expectedSig)) return null;
  } catch {
    return null;
  }

  return memberId;
}
