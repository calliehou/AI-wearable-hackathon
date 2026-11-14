import { NextResponse } from "next/server";
import { reorderPromises } from "@/lib/peri";

export const dynamic = "force-dynamic";

// Save your order for a list of promises. Body: { ids: string[] } (first = top)
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b || !Array.isArray(b.ids) || !b.ids.every((x: unknown) => typeof x === "string") || b.ids.length > 500) {
    return NextResponse.json({ error: "send { ids: string[] }" }, { status: 400 });
  }
  return NextResponse.json(await reorderPromises(b.ids));
}
