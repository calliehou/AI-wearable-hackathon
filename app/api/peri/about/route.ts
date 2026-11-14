// "About Kelly · Peri remembers", and "Places together", from the band's conversations.
import { NextResponse } from "next/server";
import { askJson, errorResponse } from "@/lib/claude";
import { materialAbout } from "@/lib/material";

export const dynamic = "force-dynamic";

const SCHEMA = {
  type: "object",
  properties: {
    who: { type: ["string", "null"] },
    right_now: { type: ["string", "null"] },
    good_to_know: { type: ["string", "null"] },
    interests: { type: "array", items: { type: "string" } },
    places: {
      type: "array",
      items: {
        type: "object",
        properties: { name: { type: "string" }, when: { type: "string" }, note: { type: "string" } },
        required: ["name", "when", "note"],
        additionalProperties: false,
      },
    },
  },
  required: ["who", "right_now", "good_to_know", "interests", "places"],
  additionalProperties: false,
};

const SYSTEM = `From summaries of conversations between the wearer (call them "you") and one person, write what a thoughtful friend would remember about that person.
- who: their role or relationship in a few words ("Product designer · roommate"), or null if unknown.
- right_now: what is going on for them lately, or null.
- good_to_know: practical things worth remembering (diet, dates, preferences), or null.
- interests: up to 5 one- or two-word interests they mentioned.
- places: places you were together or talked about meeting, only if named in the material ("Dinner on Valencia"), with when (as written) and a short note. Empty if none.
Only facts from the material. Short phrases separated by " · ". Never guess "he" or "she".`;

export async function GET(req: Request) {
  const name = new URL(req.url).searchParams.get("name")?.trim();
  if (!name) return NextResponse.json({ error: "send ?name=" }, { status: 400 });
  const m = await materialAbout(name);
  if (!m.text) return NextResponse.json({ who: null, right_now: null, good_to_know: null, interests: [], places: [], log: [], count: 0 });
  try {
    const about = await askJson<Record<string, unknown>>({ system: SYSTEM, user: `Person: ${name}\n\n${m.text}`, schema: SCHEMA, cache: "about" });
    return NextResponse.json({ ...about, log: m.log, count: m.count });
  } catch (e) {
    const r = errorResponse(e);
    return NextResponse.json({ error: r.error, log: m.log, count: m.count }, { status: r.status });
  }
}
