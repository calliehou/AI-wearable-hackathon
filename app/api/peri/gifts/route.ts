// "Gifts Kelly would actually love": ideas drawn from what the band heard.
import { NextResponse } from "next/server";
import { askJson, errorResponse } from "@/lib/claude";
import { materialAbout } from "@/lib/material";

export const dynamic = "force-dynamic";

const SCHEMA = {
  type: "object",
  properties: {
    occasion: { type: ["string", "null"] },
    said: { type: ["string", "null"] },
    ideas: {
      type: "array",
      items: {
        type: "object",
        properties: { title: { type: "string" }, why: { type: "string" }, price: { type: "string" } },
        required: ["title", "why", "price"],
        additionalProperties: false,
      },
    },
  },
  required: ["occasion", "said", "ideas"],
  additionalProperties: false,
};

const SYSTEM = `Suggest 3 gifts for one person, based only on what came up in conversations with the wearer.
- ideas: 3 specific gifts. "why" ties each to something from the material in under 10 words ("Lit up at one during your thrift run"). "price" is a rough US price like "$45".
- occasion: a birthday or event if one was mentioned ("Birthday · Saturday"), else null.
- said: one sentence summarising what the person said that matters for a gift (paraphrase, never quote them word for word), else null.
If the material has little to go on, still give 3 thoughtful, low-key ideas and say so in "why". Never guess "he" or "she".`;

export async function GET(req: Request) {
  const name = new URL(req.url).searchParams.get("name")?.trim();
  if (!name) return NextResponse.json({ error: "send ?name=" }, { status: 400 });
  const m = await materialAbout(name, 60);
  try {
    const out = await askJson<Record<string, unknown>>({ system: SYSTEM, user: `Person: ${name}\n\n${m.text || "(no conversations yet)"}`, schema: SCHEMA, cache: "gifts" });
    return NextResponse.json({ ...out, count: m.count });
  } catch (e) {
    const r = errorResponse(e);
    return NextResponse.json({ error: r.error }, { status: r.status });
  }
}
