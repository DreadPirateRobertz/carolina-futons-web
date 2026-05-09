// cfw-e9q: coverage for src/lib/wishlist/share-token.ts (cf-u89z).
// HMAC-SHA256 stateless share token for /wishlist/[token]. A defective
// verify (e.g. accidentally accepting any token or throwing on malformed
// input rather than returning null) is a real auth-leak vector — pin
// the contract here so a future refactor can't silently weaken it.

import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";

import { signMemberId, verifyShareToken } from "@/lib/wishlist/share-token";

const SECRET = "test-secret-do-not-use-in-prod";
const OTHER_SECRET = "different-secret";
const MEMBER_ID = "abc-123-member-uuid";

describe("signMemberId / verifyShareToken roundtrip", () => {
  it("verifies a token signed with the same secret + memberId", () => {
    const token = signMemberId(MEMBER_ID, SECRET);
    expect(verifyShareToken(token, SECRET)).toBe(MEMBER_ID);
  });

  it("emits a 'memberId.signature' shape (single dot delimiter)", () => {
    const token = signMemberId(MEMBER_ID, SECRET);
    const dots = token.split(".").length - 1;
    expect(dots).toBe(1);
    const [encodedId, encodedSig] = token.split(".");
    expect(encodedId.length).toBeGreaterThan(0);
    expect(encodedSig.length).toBeGreaterThan(0);
  });

  it("emits a token whose components are URL-safe (no '+', '/', '=')", () => {
    const token = signMemberId(MEMBER_ID, SECRET);
    expect(token).not.toMatch(/[+/=]/);
  });

  it("is deterministic — same input → same token", () => {
    expect(signMemberId(MEMBER_ID, SECRET)).toBe(signMemberId(MEMBER_ID, SECRET));
  });

  it("emits different tokens for different memberIds (same secret)", () => {
    expect(signMemberId("a", SECRET)).not.toBe(signMemberId("b", SECRET));
  });

  it("emits different tokens for different secrets (same memberId)", () => {
    expect(signMemberId(MEMBER_ID, SECRET)).not.toBe(
      signMemberId(MEMBER_ID, OTHER_SECRET),
    );
  });
});

describe("verifyShareToken — defensive paths", () => {
  it("returns null when verifying with the wrong secret", () => {
    const token = signMemberId(MEMBER_ID, SECRET);
    expect(verifyShareToken(token, OTHER_SECRET)).toBeNull();
  });

  it("returns null when the memberId portion is tampered", () => {
    const token = signMemberId(MEMBER_ID, SECRET);
    const [, sig] = token.split(".");
    // Re-encode a different memberId but keep the original signature.
    const tampered = `${Buffer.from("attacker-id", "utf8").toString("base64url")}.${sig}`;
    expect(verifyShareToken(tampered, SECRET)).toBeNull();
  });

  it("returns null when the signature portion is tampered", () => {
    const token = signMemberId(MEMBER_ID, SECRET);
    const [id] = token.split(".");
    // Forge a different 32-byte signature so the length check passes but
    // the timing-safe-equal returns false.
    const fakeSig = Buffer.alloc(32, 0xff).toString("base64url");
    const tampered = `${id}.${fakeSig}`;
    expect(verifyShareToken(tampered, SECRET)).toBeNull();
  });

  it("returns null when the token has no '.' delimiter", () => {
    expect(verifyShareToken("no-dot-anywhere", SECRET)).toBeNull();
    expect(verifyShareToken("", SECRET)).toBeNull();
  });

  it("returns null when the signature portion has the wrong byte length (not 32 bytes)", () => {
    // Construct a token whose sig decodes to a non-32-byte buffer. Even if
    // someone removed the explicit length check, timingSafeEqual would
    // throw on unequal-length inputs — pin both layers.
    const id = Buffer.from(MEMBER_ID, "utf8").toString("base64url");
    const shortSig = Buffer.alloc(16, 0).toString("base64url");
    expect(verifyShareToken(`${id}.${shortSig}`, SECRET)).toBeNull();
  });

  it("returns null when the signature portion is empty", () => {
    const id = Buffer.from(MEMBER_ID, "utf8").toString("base64url");
    expect(verifyShareToken(`${id}.`, SECRET)).toBeNull();
  });

  it("returns null when the memberId portion is empty (no leading delimiter)", () => {
    // ".sig" — Buffer.from("", "base64url").toString("utf8") is "" which
    // is falsy, so b64urlDecode treats it as null and we bail.
    const sig = createHmac("sha256", SECRET).update("").digest("base64url");
    expect(verifyShareToken(`.${sig}`, SECRET)).toBeNull();
  });
});

describe("verifyShareToken — defensive but not pathological", () => {
  it.each([
    ["UUID-shaped", "550e8400-e29b-41d4-a716-446655440000"],
    ["alphanumeric", "abc123def456"],
    ["with hyphens + underscores", "member_id-with_segments"],
    ["with dots in the memberId itself", "user.name.with.dots"],
    ["with URL-unsafe chars (%, +, /)", "weird+id/with%chars"],
    ["short (single char)", "a"],
  ])("roundtrips a memberId — %s", (_label, id) => {
    const token = signMemberId(id, SECRET);
    expect(verifyShareToken(token, SECRET)).toBe(id);
  });

  it("constant-time compare: token forged with the right LENGTH but wrong bytes still rejects", () => {
    // Demonstrates timingSafeEqual is doing real work — a forge that
    // matches the byte length still fails.
    const valid = signMemberId(MEMBER_ID, SECRET);
    const [id] = valid.split(".");
    const forgedSig = Buffer.alloc(32, 0).toString("base64url");
    expect(verifyShareToken(`${id}.${forgedSig}`, SECRET)).toBeNull();
  });

  it("rotating the secret invalidates ALL prior tokens (revocation contract)", () => {
    const before = signMemberId(MEMBER_ID, SECRET);
    expect(verifyShareToken(before, SECRET)).toBe(MEMBER_ID);
    // Operator rotates the secret — old token must no longer verify.
    expect(verifyShareToken(before, OTHER_SECRET)).toBeNull();
  });
});
