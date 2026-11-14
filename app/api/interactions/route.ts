import { NextResponse } from "next/server";
import { isSample, listInteractions } from "@/lib/interactions";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ sample: await isSample(), interactions: await listInteractions() });
}
