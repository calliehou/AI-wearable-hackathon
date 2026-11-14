import { NextResponse } from "next/server";
import { addPromise } from "@/lib/sendly";

export const dynamic = "force-dynamic";

// A promise added by voice in the app (screen 9). Body: { title, quote, kind, amount, due_label, due_detail, person_name }
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b.title !== "string" || typeof b.quote !== "string") {
    return NextResponse.json({ error: "send { title, quote, kind, ... }" }, { status: 400 });
  }
  return NextResponse.json(await addPromise(b));
}
