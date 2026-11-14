import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// data/live.json is rewritten by the band listener (listener/listen.py) about twice a second.
export async function GET() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "data", "live.json"), "utf-8");
    return NextResponse.json(JSON.parse(raw), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ recording: false, connected: false, turns: [], voices: {}, updated_at: null });
  }
}
