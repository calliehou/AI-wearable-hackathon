import { NextResponse } from "next/server";
import { setBandPaused } from "@/lib/peri";

export const dynamic = "force-dynamic";

// Pause or resume listening. The band listener checks data/control.json every half second
// and switches the band's microphone off while paused. Body: { paused: boolean }
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b.paused !== "boolean") return NextResponse.json({ error: "send { paused }" }, { status: 400 });
  return NextResponse.json(await setBandPaused(b.paused));
}
