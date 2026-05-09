import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { Tokens } from "@wix/sdk";

// cfw-wef (cfw-6qd.1): owner-mode auth gate. Pure-helper coverage of the
// allowlist parser + isOwnerEmail, plus the integration paths through
// getOwnerSession / requireOwnerSession against mocked Wix Members and
// next/navigation.

const cookieStore = new Map<string, { value: string }>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieStore.get(name),
  }),
}));

const redirectMock = vi.fn<(path: string) => never>((path: string) => {
  // Mirror Next's redirect by throwing so callers stop executing — the
  // production redirect() always throws too.
  throw new Error(`REDIRECT:${path}`);
});
vi.mock("next/navigation", () => ({ redirect: (p: string) => redirectMock(p) }));

const getCurrentMember = vi.fn();
vi.mock("@/lib/wix-client", () => ({
  getWixClientWithTokens: () => ({ members: { getCurrentMember } }),
}));

const memberTokens: Tokens = {
  accessToken: { value: "access-m", expiresAt: 1_780_000_000 },
  refreshToken: { value: "refresh-m", role: "member" as Tokens["refreshToken"]["role"] },
};
const visitorTokens: Tokens = {
  accessToken: { value: "access-v", expiresAt: 1_780_000_000 },
  refreshToken: { value: "refresh-v", role: "visitor" as Tokens["refreshToken"]["role"] },
};

const ORIGINAL_OWNER_EMAILS = process.env.OWNER_EMAILS;

beforeEach(() => {
  cookieStore.clear();
  vi.clearAllMocks();
  // Default: getCurrentMember returns the allowlisted owner unless a test
  // overrides it. Each call gets EXTENDED fields including loginEmail.
  getCurrentMember.mockResolvedValue({
    member: { _id: "member-owner", loginEmail: "brenda@carolinafutons.com" },
  });
});

afterEach(() => {
  // Restore env between tests so OWNER_EMAILS doesn't bleed across cases.
  if (ORIGINAL_OWNER_EMAILS === undefined) {
    delete process.env.OWNER_EMAILS;
  } else {
    process.env.OWNER_EMAILS = ORIGINAL_OWNER_EMAILS;
  }
});

describe("parseOwnerAllowlist", () => {
  it("returns empty Set for unset / empty input", async () => {
    const { parseOwnerAllowlist } = await import("@/lib/auth/owner");
    expect(parseOwnerAllowlist(undefined).size).toBe(0);
    expect(parseOwnerAllowlist(null).size).toBe(0);
    expect(parseOwnerAllowlist("").size).toBe(0);
  });

  it("normalizes case and trims whitespace", async () => {
    const { parseOwnerAllowlist } = await import("@/lib/auth/owner");
    const list = parseOwnerAllowlist("  Brenda@Example.com , chris@x.io ");
    expect(list.has("brenda@example.com")).toBe(true);
    expect(list.has("chris@x.io")).toBe(true);
    expect(list.size).toBe(2);
  });

  it("discards entries that are clearly not emails", async () => {
    const { parseOwnerAllowlist } = await import("@/lib/auth/owner");
    const list = parseOwnerAllowlist("brenda@x.com,,not-an-email,, ,@,a@b");
    // "@" alone has no chars before/after but does include "@" — accepted by
    // our intentionally-loose filter (a Wix Members loginEmail check is the
    // real source of truth). "a@b" similarly survives. The blank/no-@ entries
    // do not.
    expect(list.has("brenda@x.com")).toBe(true);
    expect(list.has("a@b")).toBe(true);
    expect(list.has("not-an-email")).toBe(false);
    expect(list.has("")).toBe(false);
  });
});

describe("isOwnerEmail", () => {
  it("returns false for null/empty when allowlist is set", async () => {
    process.env.OWNER_EMAILS = "brenda@x.com";
    const { isOwnerEmail } = await import("@/lib/auth/owner");
    expect(isOwnerEmail(null)).toBe(false);
    expect(isOwnerEmail(undefined)).toBe(false);
    expect(isOwnerEmail("")).toBe(false);
  });

  it("returns false when allowlist is unset (owner mode disabled)", async () => {
    delete process.env.OWNER_EMAILS;
    const { isOwnerEmail } = await import("@/lib/auth/owner");
    expect(isOwnerEmail("brenda@x.com")).toBe(false);
  });

  it("matches case-insensitively", async () => {
    process.env.OWNER_EMAILS = "brenda@x.com";
    const { isOwnerEmail } = await import("@/lib/auth/owner");
    expect(isOwnerEmail("BRENDA@X.com")).toBe(true);
    expect(isOwnerEmail("brenda@x.com")).toBe(true);
  });

  it("rejects emails not in the allowlist", async () => {
    process.env.OWNER_EMAILS = "brenda@x.com";
    const { isOwnerEmail } = await import("@/lib/auth/owner");
    expect(isOwnerEmail("imposter@x.com")).toBe(false);
  });
});

describe("getOwnerSession", () => {
  it("returns null when no session cookie", async () => {
    process.env.OWNER_EMAILS = "brenda@carolinafutons.com";
    const { getOwnerSession } = await import("@/lib/auth/owner");
    expect(await getOwnerSession()).toBeNull();
    expect(getCurrentMember).not.toHaveBeenCalled();
  });

  it("returns null when session is visitor (anonymous)", async () => {
    process.env.OWNER_EMAILS = "brenda@carolinafutons.com";
    cookieStore.set("wix-session", { value: JSON.stringify(visitorTokens) });
    const { getOwnerSession } = await import("@/lib/auth/owner");
    expect(await getOwnerSession()).toBeNull();
    // Member-shape check fails before any Wix call.
    expect(getCurrentMember).not.toHaveBeenCalled();
  });

  it("returns null when signed-in member's email is not allowlisted", async () => {
    process.env.OWNER_EMAILS = "brenda@carolinafutons.com";
    cookieStore.set("wix-session", { value: JSON.stringify(memberTokens) });
    // mockResolvedValue (not Once) covers both calls: getMemberSession's
    // memberId lookup and owner.ts's email lookup hit getCurrentMember
    // separately.
    getCurrentMember.mockResolvedValue({
      member: { _id: "member-imposter", loginEmail: "imposter@x.com" },
    });
    const { getOwnerSession } = await import("@/lib/auth/owner");
    expect(await getOwnerSession()).toBeNull();
  });

  it("returns null on Wix outage during email lookup (never grants ownership on transient errors)", async () => {
    process.env.OWNER_EMAILS = "brenda@carolinafutons.com";
    cookieStore.set("wix-session", { value: JSON.stringify(memberTokens) });
    // First call (getMemberSession's memberId resolution) succeeds; the
    // second call (owner.ts's email lookup) throws. This pins the owner.ts
    // error path specifically, not getMemberSession's own outage handling.
    getCurrentMember
      .mockResolvedValueOnce({ member: { _id: "member-owner" } })
      .mockRejectedValueOnce(new Error("Wix down"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { getOwnerSession } = await import("@/lib/auth/owner");
    expect(await getOwnerSession()).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("returns OwnerSession when allowlisted owner is signed in", async () => {
    process.env.OWNER_EMAILS = "brenda@carolinafutons.com,chris@x.io";
    cookieStore.set("wix-session", { value: JSON.stringify(memberTokens) });
    const { getOwnerSession } = await import("@/lib/auth/owner");
    const session = await getOwnerSession();
    expect(session).not.toBeNull();
    expect(session?.email).toBe("brenda@carolinafutons.com");
    expect(session?.memberId).toBe("member-owner");
    expect(session?.accessToken).toBe("access-m");
  });

  it("requests EXTENDED fieldset so loginEmail is populated", async () => {
    process.env.OWNER_EMAILS = "brenda@carolinafutons.com";
    cookieStore.set("wix-session", { value: JSON.stringify(memberTokens) });
    const { getOwnerSession } = await import("@/lib/auth/owner");
    await getOwnerSession();
    expect(getCurrentMember).toHaveBeenCalledWith({ fieldsets: ["EXTENDED"] });
  });
});

describe("requireOwnerSession", () => {
  it("redirects to /account?next=<callback> when no session", async () => {
    process.env.OWNER_EMAILS = "brenda@carolinafutons.com";
    const { requireOwnerSession } = await import("@/lib/auth/owner");
    await expect(requireOwnerSession()).rejects.toThrow(
      "REDIRECT:/account?next=%2Fadmin",
    );
  });

  it("encodes the callbackUrl into the redirect", async () => {
    process.env.OWNER_EMAILS = "brenda@carolinafutons.com";
    const { requireOwnerSession } = await import("@/lib/auth/owner");
    await expect(requireOwnerSession("/admin/site-content?key=foo")).rejects.toThrow(
      "REDIRECT:/account?next=%2Fadmin%2Fsite-content%3Fkey%3Dfoo",
    );
  });

  it("redirects to / for signed-in non-owners (no /admin disclosure)", async () => {
    process.env.OWNER_EMAILS = "brenda@carolinafutons.com";
    cookieStore.set("wix-session", { value: JSON.stringify(memberTokens) });
    // Both calls (memberId resolution + email lookup) get the imposter.
    getCurrentMember.mockResolvedValue({
      member: { _id: "imposter", loginEmail: "imposter@x.com" },
    });
    const { requireOwnerSession } = await import("@/lib/auth/owner");
    await expect(requireOwnerSession()).rejects.toThrow("REDIRECT:/");
  });

  it("returns the OwnerSession for an allowlisted owner", async () => {
    process.env.OWNER_EMAILS = "brenda@carolinafutons.com";
    cookieStore.set("wix-session", { value: JSON.stringify(memberTokens) });
    const { requireOwnerSession } = await import("@/lib/auth/owner");
    const owner = await requireOwnerSession();
    expect(owner.email).toBe("brenda@carolinafutons.com");
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
