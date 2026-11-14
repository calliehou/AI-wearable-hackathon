import { NextResponse } from "next/server";
import { snapshot } from "@/lib/peri";

export const dynamic = "force-dynamic";

// Everything the Peri app shows: people, promises, and voices waiting for a name.
export async function GET() {
  return NextResponse.json(await snapshot(), { headers: { "Cache-Control": "no-store" } });
}
