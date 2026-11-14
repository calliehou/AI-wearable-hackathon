import { NextResponse } from "next/server";
import { updatePromise } from "@/lib/peri";

export const dynamic = "force-dynamic";

const TYPES = ["Money", "Gift", "Task", "Plan"];
const STATUS = ["open", "done", "dismissed"];

// Body (all optional): { person_name, status, type, due_label, due_detail, amount, title }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const b = await req.json().catch(() => null);
  const ok = b && typeof b === "object"
    && (b.person_name === undefined || b.person_name === null || typeof b.person_name === "string")
    && (b.status === undefined || STATUS.includes(b.status))
    && (b.type === undefined || TYPES.includes(b.type))
    && (b.due_label === undefined || typeof b.due_label === "string")
    && (b.due_detail === undefined || b.due_detail === null || typeof b.due_detail === "string")
    && (b.amount === undefined || b.amount === null || typeof b.amount === "number")
    && (b.title === undefined || typeof b.title === "string");
  if (!ok) return NextResponse.json({ error: "bad change" }, { status: 400 });
  const item = await updatePromise((await params).id, b);
  return item ? NextResponse.json(item) : NextResponse.json({ error: "not found" }, { status: 404 });
}
