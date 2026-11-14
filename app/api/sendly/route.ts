import { NextResponse } from "next/server";
import { snapshot } from "@/lib/sendly";

export const dynamic = "force-dynamic";

// Everything the Sendly app shows: people, promises, and voices waiting for a name.
export async function GET() {
  return NextResponse.json(await snapshot(), { headers: { "Cache-Control": "no-store" } });
}
