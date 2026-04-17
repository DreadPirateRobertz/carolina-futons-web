import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: "not-implemented",
      message:
        "GET /api/search?q=... is scaffolded; godfrey owns implementation (cf-3qt.2 product search).",
    },
    { status: 501 },
  );
}
