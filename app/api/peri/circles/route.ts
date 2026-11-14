import { NextResponse } from "next/server";
import { createCircle } from "@/lib/peri";

export const dynamic = "force-dynamic";

// New circle (tag). Body: { name, color }
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b.name !== "string" || typeof b.color !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(b.color)) {
    return NextResponse.json({ error: "send { name, color: '#RRGGBB' }" }, { status: 400 });
  }
  return NextResponse.json(await createCircle(b.name, b.color));
}
