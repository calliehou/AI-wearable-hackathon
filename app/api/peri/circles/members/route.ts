import { NextResponse } from "next/server";
import { setMembership } from "@/lib/peri";

export const dynamic = "force-dynamic";

// Put someone in a circle or take them out. Body: { person, circle, member: boolean }
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b.person !== "string" || typeof b.circle !== "string" || typeof b.member !== "boolean") {
    return NextResponse.json({ error: "send { person, circle, member }" }, { status: 400 });
  }
  return NextResponse.json(await setMembership(b.person, b.circle, b.member));
}
