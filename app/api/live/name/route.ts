import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Body: { speaker: number, name: string }. The band listener picks this up within half a
// second, names the voice and saves its voiceprint, so it is recognised from then on.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.speaker !== "number" || typeof body.name !== "string") {
    return NextResponse.json({ error: "send { speaker: number, name: string }" }, { status: 400 });
  }
  const line = JSON.stringify({ speaker: body.speaker, name: body.name.trim().slice(0, 60) }) + "\n";
  await fs.appendFile(path.join(process.cwd(), "data", "live_names.jsonl"), line, "utf-8");
  return NextResponse.json({ ok: true });
}
