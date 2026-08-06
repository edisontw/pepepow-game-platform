import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "pepepow-game-platform",
    chainProvider: process.env.PEPEPOW_CHAIN_PROVIDER ?? "light-api",
  });
}
