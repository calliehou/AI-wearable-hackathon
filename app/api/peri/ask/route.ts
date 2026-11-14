// Ask Peri: chat about your people and promises, and fix promises by asking
// ("Make Leo's due Thursday"). Changes are applied here and listed in the answer.
import { NextResponse } from "next/server";
import { askJson, errorResponse } from "@/lib/claude";
import { overview, updatePromise } from "@/lib/peri";

export const dynamic = "force-dynamic";

const SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" },
    changes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          promise_id: { type: "string" },
          due_label: { type: ["string", "null"] },
          due_detail: { type: ["string", "null"] },
          status: { anyOf: [{ type: "string", enum: ["open", "done", "dismissed"] }, { type: "null" }] },
          type: { anyOf: [{ type: "string", enum: ["Money", "Gift", "Task", "Plan"] }, { type: "null" }] },
          person_name: { type: ["string", "null"] },
        },
        required: ["promise_id", "due_label", "due_detail", "status", "type", "person_name"],
        additionalProperties: false,
      },
    },
  },
  required: ["reply", "changes"],
  additionalProperties: false,
};

const SYSTEM = `You are Peri, a warm, brief assistant that helps the user keep the promises they make to people. Their Vexo band hears conversations; you see the summaries, people and promises below.
- Answer in 1-3 short sentences, friendly, no lists unless asked.
- To change a promise (due date, done, not a promise, kind, who it's for), add it to "changes" with its exact promise_id and only the fields to change (others null), and say what you changed.
- Never invent people, promises or facts. If unsure which promise they mean, ask.
- Due labels look like "Today", "Tonight", "Tmrw", "Thu", "Mon".
- The band cannot vibrate; reminders arrive as phone notifications.`;

type Change = {
  promise_id: string; due_label: string | null; due_detail: string | null;
  status: "open" | "done" | "dismissed" | null; type: "Money" | "Gift" | "Task" | "Plan" | null; person_name: string | null;
};

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b.message !== "string" || !b.message.trim()) return NextResponse.json({ error: "send { message }" }, { status: 400 });
  const history: { role: string; text: string }[] = Array.isArray(b.history) ? b.history.slice(-8) : [];
  const { snap, talks } = await overview();
  const ctx = [
    `Today: ${new Date().toDateString()}`,
    "People: " + snap.people.map((p) => `${p.name} (${p.circles.join("/") || "no circle"}, last talk ${p.lastTalk}, ${p.open} open)`).join("; "),
    "Open promises:\n" + snap.todos.filter((t) => t.status === "open")
      .map((t) => `- id=${t.id} "${t.title}" to ${t.personName ?? "unknown"} · ${t.type} · due ${t.dueLabel}${t.dueDetail ? " " + t.dueDetail : ""}`).join("\n"),
    "Recent conversations:\n" + talks.slice(0, 12).map((t) => `- ${new Date(t.started_at).toDateString()}: ${t.title}. ${t.summary}`).join("\n"),
  ].join("\n\n");
  const convo = history.map((h) => `${h.role === "user" ? "User" : "Peri"}: ${h.text}`).join("\n");
  try {
    const out = await askJson<{ reply: string; changes: Change[] }>({
      system: SYSTEM,
      effort: "medium",
      user: `${ctx}\n\n${convo ? convo + "\n" : ""}User: ${b.message.trim()}`,
      schema: SCHEMA,
    });
    const applied = [];
    for (const c of out.changes) {
      const done = await updatePromise(c.promise_id, {
        ...(c.due_label ? { due_label: c.due_label } : {}),
        ...(c.due_detail !== null ? { due_detail: c.due_detail } : {}),
        ...(c.status ? { status: c.status } : {}),
        ...(c.type ? { type: c.type } : {}),
        ...(c.person_name ? { person_name: c.person_name } : {}),
      });
      if (done) applied.push({ id: done.id, title: done.title, due_label: done.due_label, status: done.status });
    }
    return NextResponse.json({ reply: out.reply, applied });
  } catch (e) {
    const r = errorResponse(e);
    return NextResponse.json({ error: r.error }, { status: r.status });
  }
}
