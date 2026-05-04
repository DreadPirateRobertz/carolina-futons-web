import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const isProd = BASE_URL !== "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    // ── Auth setup ──────────────────────────────────────────────────────────
    // Runs auth.setup.ts once before the "member" project. Saves a session
    // cookie to playwright/.auth/member.json (gitignored). When staging env
    // vars are absent it writes an empty storageState so the file always exists.
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },

    // ── Unauthenticated (visitor) ────────────────────────────────────────────
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /member\.spec\.ts/,
    },

    // ── Authenticated (member) ───────────────────────────────────────────────
    // Depends on "setup" so auth.setup.ts always runs first. Specs that should
    // only run as a logged-in member live in e2e/member.spec.ts.
    {
      name: "member",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/member.json",
      },
      testMatch: /member\.spec\.ts/,
      dependencies: ["setup"],
    },
  ],
  // Skip local webServer when pointing at an external URL (prod/staging)
  ...(isProd
    ? {}
    : {
        webServer: {
          command: "npm run dev",
          url: "http://localhost:3000",
          reuseExistingServer: !process.env.CI,
        },
      }),
});
