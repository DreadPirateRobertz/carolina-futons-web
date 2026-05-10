import { NextResponse } from "next/server";

// cf-x6ph (cf-3qt.8): liveness endpoint for synthetic monitoring (UptimeRobot
// / Better Uptime) during the DNS cutover and post-cutover stability window.
// Schema is the contract documented in `docs/monitoring-runbook.md` —
// changing it requires a runbook update.
//
// Deliberately minimal: a 200 here proves only that the Vercel deployment is
// up and the Next.js runtime is serving routes. It does NOT prove Wix Stores
// reachability, cart flows, or DB writes — those belong in the cf-3qt.8
// smoke playbook, not in the monitoring probe.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      // Vercel injects VERCEL_GIT_COMMIT_SHA at build time; falls back to
      // package.json version (set on local) and finally "unknown" so the
      // monitor never sees a missing field.
      version:
        process.env.VERCEL_GIT_COMMIT_SHA
        || process.env.npm_package_version
        || "unknown",
    },
    {
      status: 200,
      headers: {
        // Defeat any downstream proxy / CDN cache so the monitor always
        // sees a fresh response.
        "Cache-Control": "no-store",
      },
    },
  );
}
