import { NextResponse } from "next/server";
import { getInteraction, renamePerson } from "@/lib/interactions";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const item = await getInteraction((await params).id);
  return item ? NextResponse.json(item) : NextResponse.json({ error: "not found" }, { status: 404 });
}

// Body: { speaker: number, name: string | null }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.speaker !== "number" || !(typeof body.name === "string" || body.name === null)) {
    return NextResponse.json({ error: "send { speaker: number, name: string | null }" }, { status: 400 });
  }
  try {
    const item = await renamePerson((await params).id, body.speaker, body.name);
    return item ? NextResponse.json(item) : NextResponse.json({ error: "not found" }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }
}
