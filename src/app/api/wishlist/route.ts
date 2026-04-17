import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const stub = (method: string) =>
  NextResponse.json(
    {
      ok: false,
      error: "not-implemented",
      message: `${method} /api/wishlist is scaffolded; rennala owns implementation (cf-3qt.3 members/wishlist).`,
    },
    { status: 501 },
  );

export async function GET() {
  return stub("GET");
}

export async function POST() {
  return stub("POST");
}

export async function DELETE() {
  return stub("DELETE");
}
