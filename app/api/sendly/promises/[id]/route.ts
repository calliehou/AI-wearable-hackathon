import { NextResponse } from "next/server";
import { updatePromise } from "@/lib/sendly";

export const dynamic = "force-dynamic";

// Body: { person_name?: string | null, status?: "open" | "done" | "dismissed" }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const body = await req.json().catch(() => null);
  const ok = body && (body.person_name === undefined || body.person_name === null || typeof body.person_name === "string")
    && (body.status === undefined || ["open", "done", "dismissed"].includes(body.status));
  if (!ok) return NextResponse.json({ error: "send { person_name?, status? }" }, { status: 400 });
  const item = await updatePromise((await params).id, { person_name: body.person_name, status: body.status });
  return item ? NextResponse.json(item) : NextResponse.json({ error: "not found" }, { status: 404 });
}
