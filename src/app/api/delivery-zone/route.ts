import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: "not-implemented",
      message:
        "GET /api/delivery-zone?zip=XXXXX is scaffolded; godfrey owns implementation (cf-3qt.2 PDP delivery estimator).",
    },
    { status: 501 },
  );
}

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "not-implemented",
      message: "POST /api/delivery-zone is scaffolded; godfrey owns implementation (cf-3qt.2).",
    },
    { status: 501 },
  );
}
