import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/claude";
import { enrichIdeas, type IdeaKind } from "@/lib/ideas";

export const dynamic = "force-dynamic";

const KINDS = ["product", "place", "recipe", "activity", "other"];

// Real pages and photos for Ask Peri's ideas. Body: { ideas: [{ title, kind, search }] }
// Returns [{ link, image, source }] in the same order (a search link when no page was found).
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const ideas = Array.isArray(b?.ideas) ? b.ideas.slice(0, 4) : null;
  if (!ideas?.length || !ideas.every((x: { title?: unknown; kind?: unknown; search?: unknown }) =>
    typeof x?.title === "string" && typeof x?.search === "string" && KINDS.includes(x?.kind as string))) {
    return NextResponse.json({ error: "send { ideas: [{ title, kind, search }] }" }, { status: 400 });
  }
  try {
    const clean = ideas.map((x: { title: string; kind: IdeaKind; search: string }) => ({ title: x.title, kind: x.kind, search: x.search }));
    return NextResponse.json(await enrichIdeas(clean));
  } catch (e) {
    const r = errorResponse(e);
    return NextResponse.json({ error: r.error }, { status: r.status });
  }
}
