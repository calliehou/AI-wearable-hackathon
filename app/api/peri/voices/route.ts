import { NextResponse } from "next/server";
import { nameVoice } from "@/lib/peri";

export const dynamic = "force-dynamic";

// Body: { interaction_id: string, speaker: number, name: string }. Teaches the band this voice.
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b.interaction_id !== "string" || typeof b.speaker !== "number" || typeof b.name !== "string") {
    return NextResponse.json({ error: "send { interaction_id, speaker, name }" }, { status: 400 });
  }
  const item = await nameVoice(b.interaction_id, b.speaker, b.name);
  return item ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "not found" }, { status: 404 });
}
