import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/lib/wix-client", () => ({
  getWixClientWithTokens: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  SESSION_COOKIE_NAME: "wix-session",
  SESSION_COOKIE_OPTIONS: { httpOnly: true, path: "/" },
  parseSessionCookie: vi.fn(),
  serializeSessionTokens: vi.fn((t) => JSON.stringify(t)),
}));

// cf-puqx (cf-f9o1.fu2 wave 2): mock the Sentry-backed error helper so
// the new logWixFailure assertions don't fire @sentry/nextjs + flush.
const logWixFailure = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/wix/errors", () => ({
  logWixFailure: (...args: unknown[]) => logWixFailure(...args),
}));

import { cookies } from "next/headers";
import { getWixClientWithTokens } from "@/lib/wix-client";
import { parseSessionCookie } from "@/lib/auth/session";
import { getVisitorCartClient } from "@/lib/wix/wix-visitor-client";

const mockTokens = {
  accessToken: { value: "access-abc", expiresAt: 9999999999 },
  refreshToken: { value: "refresh-xyz", role: "member" as const },
};

const mockJar = {
  get: vi.fn(),
  set: vi.fn(),
};

const mockAnonClient = {
  auth: { generateVisitorTokens: vi.fn() },
};

const mockSeededClient = {};

beforeEach(() => {
  vi.clearAllMocks();
  (cookies as ReturnType<typeof vi.fn>).mockResolvedValue(mockJar);
  mockJar.get.mockReturnValue(undefined);
  (parseSessionCookie as ReturnType<typeof vi.fn>).mockReturnValue(null);
  (getWixClientWithTokens as ReturnType<typeof vi.fn>).mockImplementation(
    (tokens?: unknown) => (tokens ? mockSeededClient : mockAnonClient),
  );
  mockAnonClient.auth.generateVisitorTokens.mockResolvedValue(mockTokens);
  logWixFailure.mockClear();
});

describe("getVisitorCartClient", () => {
  it("returns seeded client immediately when valid session cookie exists", async () => {
    (parseSessionCookie as ReturnType<typeof vi.fn>).mockReturnValue(mockTokens);
    mockJar.get.mockReturnValue({ value: "existing-cookie" });

    const client = await getVisitorCartClient();

    expect(client).toBe(mockSeededClient);
    expect(mockAnonClient.auth.generateVisitorTokens).not.toHaveBeenCalled();
    expect(mockJar.set).not.toHaveBeenCalled();
  });

  it("generates visitor tokens on first visit (no cookie)", async () => {
    await getVisitorCartClient();

    expect(mockAnonClient.auth.generateVisitorTokens).toHaveBeenCalledOnce();
  });

  it("returns a client seeded with the generated tokens", async () => {
    const client = await getVisitorCartClient();

    expect(getWixClientWithTokens).toHaveBeenLastCalledWith(mockTokens);
    expect(client).toBe(mockSeededClient);
  });

  it("persists generated tokens in the session cookie", async () => {
    await getVisitorCartClient();

    expect(mockJar.set).toHaveBeenCalledWith(
      "wix-session",
      JSON.stringify(mockTokens),
      expect.objectContaining({ httpOnly: true, maxAge: 30 * 24 * 60 * 60 }),
    );
  });

  it("does not set a cookie when a valid session already exists", async () => {
    (parseSessionCookie as ReturnType<typeof vi.fn>).mockReturnValue(mockTokens);
    mockJar.get.mockReturnValue({ value: "existing-cookie" });

    await getVisitorCartClient();

    expect(mockJar.set).not.toHaveBeenCalled();
  });

  it("throws when generateVisitorTokens fails (lets callers decide redirect-with-error)", async () => {
    mockAnonClient.auth.generateVisitorTokens.mockRejectedValue(
      new Error("network timeout"),
    );

    await expect(getVisitorCartClient()).rejects.toThrow("network timeout");
    expect(mockJar.set).not.toHaveBeenCalled();
  });

  it("still returns a seeded client when jar.set throws (headers already sent)", async () => {
    mockJar.set.mockImplementation(() => {
      throw new Error("Cannot set headers after they are sent");
    });

    const client = await getVisitorCartClient();

    expect(client).toBe(mockSeededClient);
  });

  it("treats a malformed cookie value as missing and generates fresh tokens", async () => {
    mockJar.get.mockReturnValue({ value: "not-valid-json{{" });
    (parseSessionCookie as ReturnType<typeof vi.fn>).mockReturnValue(null);

    await getVisitorCartClient();

    expect(mockAnonClient.auth.generateVisitorTokens).toHaveBeenCalledOnce();
    expect(mockJar.set).toHaveBeenCalledOnce();
  });

  it("warns when session cookie is present but parseSessionCookie returns null", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockJar.get.mockReturnValue({ value: "corrupt-value" });
    (parseSessionCookie as ReturnType<typeof vi.fn>).mockReturnValue(null);

    await getVisitorCartClient();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("unparseable"),
    );
    warnSpy.mockRestore();
  });

  // cf-puqx wave 2: Sentry tagging for the silent-failure paths SFH flagged
  // on PR #611. Tests pin the breadcrumb contract — Sentry has to see the
  // failure so on-call can correlate cart-session bugs back to the auth
  // layer, not just the cart API where the error eventually surfaces.
  describe("Sentry tagging on silent-failure paths", () => {
    it("tags Sentry on unexpected jar.set failure (NOT the expected RSC-context warning)", async () => {
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const jarErr = new Error("serializer crash");
      mockJar.set.mockImplementation(() => {
        throw jarErr;
      });

      const client = await getVisitorCartClient();

      expect(client).toBe(mockSeededClient); // still returns valid client
      expect(logWixFailure).toHaveBeenCalledWith(
        "cart",
        "setVisitorTokens",
        jarErr,
      );
      errSpy.mockRestore();
    });

    it("does NOT tag Sentry on the expected RSC-context jar.set warning", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      mockJar.set.mockImplementation(() => {
        throw new Error("Cookies can only be modified in a Server Action or Route Handler");
      });

      await getVisitorCartClient();

      // RSC context is expected — should warn, not tag.
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("RSC"));
      expect(logWixFailure).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it("tags Sentry with auth-layer op before re-throwing generateVisitorTokens failure", async () => {
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const authErr = new Error("auth backend 503");
      mockAnonClient.auth.generateVisitorTokens.mockRejectedValueOnce(authErr);

      await expect(getVisitorCartClient()).rejects.toThrow("auth backend 503");
      // Op tag MUST distinguish auth-layer failure from the cart-API
      // catches that will also see this error after re-throw.
      expect(logWixFailure).toHaveBeenCalledWith(
        "cart",
        "generateVisitorTokens",
        authErr,
      );
      errSpy.mockRestore();
    });

    it("passes a non-Error rejection through without wrapping (parity with addItemAction)", async () => {
      // cart-actions.test.ts pins this for addItemAction; visitor-client
      // must match — Wix SDK rejections occasionally surface as strings,
      // and a future `instanceof Error` guard added here would silently
      // swallow them. `.rejects.toBe` pins identity, not just truthiness.
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockAnonClient.auth.generateVisitorTokens.mockRejectedValueOnce(
        "auth-string-not-error",
      );

      await expect(getVisitorCartClient()).rejects.toBe(
        "auth-string-not-error",
      );
      expect(logWixFailure).toHaveBeenCalledWith(
        "cart",
        "generateVisitorTokens",
        "auth-string-not-error",
      );
      errSpy.mockRestore();
    });

    it("logs to Sentry BEFORE re-throwing on generateVisitorTokens failure (call order)", async () => {
      // A future refactor could move logging into a `.catch()` on the
      // re-thrown promise — this test pins the synchronous log-then-throw
      // order so the breadcrumb ships before the action-level catch sees
      // the same error and double-tags it.
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const authErr = new Error("auth-fail-order");
      mockAnonClient.auth.generateVisitorTokens.mockRejectedValueOnce(authErr);

      let logCalledBeforeThrow = false;
      logWixFailure.mockImplementationOnce(async () => {
        logCalledBeforeThrow = true;
        return undefined;
      });

      await expect(getVisitorCartClient()).rejects.toThrow("auth-fail-order");
      expect(logCalledBeforeThrow).toBe(true);
      errSpy.mockRestore();
    });
  });
});
