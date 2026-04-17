import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "not-implemented",
      message:
        "POST /api/order-lookup is scaffolded; blaidd owns implementation (cf-3qt.4 guest order lookup via Velo).",
    },
    { status: 501 },
  );
}
