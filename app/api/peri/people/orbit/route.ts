import { NextResponse } from "next/server";
import { setOrbit } from "@/lib/peri";

export const dynamic = "force-dynamic";

// Choose someone's orbit. Body: { person, ring: 1 | 2 | 3 | null }  (null = automatic)
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b.person !== "string" || ![1, 2, 3, null].includes(b.ring)) {
    return NextResponse.json({ error: "send { person, ring: 1 | 2 | 3 | null }" }, { status: 400 });
  }
  return NextResponse.json(await setOrbit(b.person, b.ring));
}
