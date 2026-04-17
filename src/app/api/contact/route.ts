import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "not-implemented",
      message: "POST /api/contact is scaffolded; blaidd owns implementation (cf-3qt.4).",
    },
    { status: 501 },
  );
}
