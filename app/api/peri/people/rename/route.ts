import { NextResponse } from "next/server";
import { renamePersonEverywhere } from "@/lib/peri";

export const dynamic = "force-dynamic";

// Rename someone everywhere. Body: { from, to }
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b.from !== "string" || typeof b.to !== "string" || !b.to.trim()) {
    return NextResponse.json({ error: "send { from, to }" }, { status: 400 });
  }
  try {
    return NextResponse.json(await renamePersonEverywhere(b.from, b.to));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
