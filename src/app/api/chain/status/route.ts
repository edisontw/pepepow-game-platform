import { NextResponse } from "next/server";
import { createChainProvider } from "@/server/blockchain";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const provider = createChainProvider();
    const height = await provider.getHeight();
    return NextResponse.json({ ok: true, provider: provider.name, height });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown blockchain provider error";
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}
