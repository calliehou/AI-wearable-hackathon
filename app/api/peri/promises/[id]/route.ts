import { NextResponse } from "next/server";
import { deletePromise, updatePromise } from "@/lib/peri";

export const dynamic = "force-dynamic";

const TYPES = ["Money", "Gift", "Task", "Plan"];
const STATUS = ["open", "done", "dismissed"];

// Body (all optional): { person_name, status, type, due_label, due_detail, amount, title, due_date "YYYY-MM-DD", due_time "HH:MM" }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const b = await req.json().catch(() => null);
  const ok = b && typeof b === "object"
    && (b.person_name === undefined || b.person_name === null || typeof b.person_name === "string")
    && (b.status === undefined || STATUS.includes(b.status))
    && (b.type === undefined || TYPES.includes(b.type))
    && (b.due_label === undefined || typeof b.due_label === "string")
    && (b.due_detail === undefined || b.due_detail === null || typeof b.due_detail === "string")
    && (b.amount === undefined || b.amount === null || typeof b.amount === "number")
    && (b.title === undefined || typeof b.title === "string")
    && (b.due_date === undefined || b.due_date === null || /^\d{4}-\d{2}-\d{2}$/.test(b.due_date))
    && (b.due_time === undefined || b.due_time === null || /^\d{2}:\d{2}$/.test(b.due_time));
  if (!ok) return NextResponse.json({ error: "bad change" }, { status: 400 });
  const item = await updatePromise((await params).id, b);
  return item ? NextResponse.json(item) : NextResponse.json({ error: "not found" }, { status: 404 });
}

// Delete a promise for good.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ok = await deletePromise((await params).id);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "not found" }, { status: 404 });
}
