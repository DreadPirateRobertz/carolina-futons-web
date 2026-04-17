import { describe, it, expect } from "vitest";
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  parseSessionCookie,
  serializeSessionTokens,
} from "@/lib/auth/session";
import type { Tokens } from "@wix/sdk";

const validTokens: Tokens = {
  accessToken: { value: "access-abc", expiresAt: 1_780_000_000 },
  refreshToken: { value: "refresh-xyz", role: "visitor" as Tokens["refreshToken"]["role"] },
};

describe("auth/session", () => {
  it("exports a stable cookie name", () => {
    expect(SESSION_COOKIE_NAME).toBe("wix-session");
  });

  it("cookie options are httpOnly + sameSite lax + path /", () => {
    expect(SESSION_COOKIE_OPTIONS.httpOnly).toBe(true);
    expect(SESSION_COOKIE_OPTIONS.sameSite).toBe("lax");
    expect(SESSION_COOKIE_OPTIONS.path).toBe("/");
  });

  it("roundtrips tokens through serialize / parse", () => {
    const serialized = serializeSessionTokens(validTokens);
    const parsed = parseSessionCookie(serialized);
    expect(parsed).toEqual(validTokens);
  });

  it("parseSessionCookie returns null for empty / undefined / null input", () => {
    expect(parseSessionCookie(undefined)).toBeNull();
    expect(parseSessionCookie(null)).toBeNull();
    expect(parseSessionCookie("")).toBeNull();
  });

  it("parseSessionCookie returns null for malformed JSON", () => {
    expect(parseSessionCookie("not-json")).toBeNull();
    expect(parseSessionCookie("{broken")).toBeNull();
  });

  it("parseSessionCookie returns null when shape is wrong", () => {
    expect(parseSessionCookie(JSON.stringify({}))).toBeNull();
    expect(parseSessionCookie(JSON.stringify({ accessToken: "str" }))).toBeNull();
    expect(
      parseSessionCookie(JSON.stringify({ accessToken: { value: "a" } })),
    ).toBeNull();
    expect(
      parseSessionCookie(
        JSON.stringify({
          accessToken: { value: "a" },
          refreshToken: { role: "visitor" },
        }),
      ),
    ).toBeNull();
  });

  it("parseSessionCookie accepts well-shaped tokens even with extra fields", () => {
    const withExtras = {
      ...validTokens,
      extraField: "ignored",
    };
    const parsed = parseSessionCookie(JSON.stringify(withExtras));
    expect(parsed).toMatchObject(validTokens);
  });
});
