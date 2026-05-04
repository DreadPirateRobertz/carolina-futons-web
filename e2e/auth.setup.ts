/**
 * Auth setup for Playwright member-authenticated tests.
 *
 * Runs once before the "member" project's specs. Logs in via the Wix OAuth
 * flow and saves a storageState (session cookie) to playwright/.auth/member.json
 * so subsequent tests skip the login round-trip entirely.
 *
 * Required env vars (staging only):
 *   TEST_MEMBER_EMAIL    — seeded test-member email address
 *   TEST_MEMBER_PASSWORD — seeded test-member password
 *   WIX_CLIENT_ID_HEADLESS — OAuth App client ID (Stilgar-provisioned)
 *
 * When vars are absent the setup test writes an empty storageState so the
 * member project file reference never breaks — member-gated specs will see no
 * session cookie and redirect to /account as designed.
 */

import { test as setup, expect } from "@playwright/test";
import path from "path";
import { mkdirSync, writeFileSync } from "fs";

export const MEMBER_AUTH_FILE = path.join(
  __dirname,
  "../playwright/.auth/member.json",
);

const CREDENTIALS_PRESENT = Boolean(
  process.env.TEST_MEMBER_EMAIL && process.env.TEST_MEMBER_PASSWORD,
);

setup("authenticate as test member", async ({ page, request }) => {
  if (!CREDENTIALS_PRESENT) {
    mkdirSync(path.dirname(MEMBER_AUTH_FILE), { recursive: true });
    writeFileSync(MEMBER_AUTH_FILE, JSON.stringify({ cookies: [], origins: [] }));
    return;
  }

  // 1. Start the OAuth flow — receive the Wix-hosted authUrl.
  const post = await request.post("/api/auth/session", {
    data: { callbackUrl: "/dashboard" },
  });
  expect(post.ok(), "POST /api/auth/session should succeed").toBeTruthy();
  const { authUrl } = (await post.json()) as { authUrl: string };
  expect(authUrl, "authUrl must be a https URL").toMatch(/^https:\/\//);

  // 2. Drive the Wix-hosted login page.
  await page.goto(authUrl);
  await page.getByLabel(/email/i).fill(process.env.TEST_MEMBER_EMAIL!);
  await page.getByLabel(/password/i).fill(process.env.TEST_MEMBER_PASSWORD!);
  await page.getByRole("button", { name: /sign in|log in|continue/i }).click();

  // 3. Wix redirects back to /api/auth/session?code=… which sets the cookie
  //    and bounces to /dashboard.
  await page.waitForURL((u) => u.pathname.startsWith("/dashboard"), {
    timeout: 30_000,
  });

  // Verify the session cookie before saving.
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find((c) => c.name === "wix-session");
  expect(sessionCookie, "wix-session cookie must be set after login").toBeDefined();
  expect(sessionCookie?.httpOnly, "session cookie must be httpOnly").toBe(true);

  // 4. Save state — all member-project specs start with this session.
  await page.context().storageState({ path: MEMBER_AUTH_FILE });
});
