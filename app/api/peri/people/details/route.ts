import { NextResponse } from "next/server";
import { setDetails } from "@/lib/peri";

export const dynamic = "force-dynamic";

// Save someone's phone, email or website. Body: { person, phone?, email?, website? }
// A string sets it (marked as typed by you); null or "" removes it; a missing field is unchanged.
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const ok = (v: unknown) => v === undefined || v === null || typeof v === "string";
  if (!b || typeof b.person !== "string" || !ok(b.phone) || !ok(b.email) || !ok(b.website)) {
    return NextResponse.json({ error: "send { person, phone?, email?, website? }" }, { status: 400 });
  }
  return NextResponse.json(await setDetails(b.person, { phone: b.phone, email: b.email, website: b.website }));
}
