import { NextResponse } from "next/server";

// cf-3qt.8.30: liveness endpoint for synthetic monitoring (UptimeRobot /
// Better Uptime) during the cf-3qt.8 DNS cutover. The endpoint is
// deliberately minimal — no DB calls, no Wix SDK calls — so a 200 here
// proves only that the Vercel deployment is up and the Next.js runtime is
// serving routes. Service-level health (Wix Stores reachability, cart
// flows) is verified separately by the cf-3qt.8 smoke playbook.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      ts: new Date().toISOString(),
      env: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    },
    { status: 200 },
  );
}
