// Ideas Ask Peri recommends (gifts, recipes, places…), as cards with a link and a photo.
// 1. ideaLink(): a search link that always works, so a card is usable at once.
// 2. enrichIdeas(): Claude's web search finds one real page per idea (only URLs the search
//    actually returned are kept), then the page's preview photo (og:image) is read.
import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";

export type IdeaKind = "product" | "place" | "recipe" | "activity" | "other";
export type Idea = {
  title: string; why: string; price: string | null; kind: IdeaKind; search: string;
  link: string; image: string | null; source: string | null;
};

export const IDEA_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    why: { type: "string" },
    price: { type: ["string", "null"] },
    kind: { type: "string", enum: ["product", "place", "recipe", "activity", "other"] },
    search: { type: "string" },
  },
  required: ["title", "why", "price", "kind", "search"],
  additionalProperties: false,
};

export function ideaLink(kind: IdeaKind, search: string) {
  const q = encodeURIComponent(search);
  if (kind === "product") return `https://www.google.com/search?tbm=shop&q=${q}`;
  if (kind === "place") return `https://www.google.com/maps/search/?api=1&query=${q}`;
  return `https://www.google.com/search?q=${q}`;
}

const CACHE = path.join(process.cwd(), "data", "cache");

type Found = { link: string; image: string | null; source: string | null };

export async function enrichIdeas(ideas: { title: string; kind: IdeaKind; search: string }[]): Promise<Found[]> {
  const key = createHash("sha1").update(JSON.stringify(ideas)).digest("hex").slice(0, 20);
  const file = path.join(CACHE, `ideas-${key}.json`);
  const hit = await fs.readFile(file, "utf-8").catch(() => null);
  if (hit) return JSON.parse(hit) as Found[];

  const pages = await findPages(ideas).catch(() => new Map<number, string>());
  const found = await Promise.all(ideas.map(async (idea, i) => {
    const url = pages.get(i + 1);
    if (!url) return { link: ideaLink(idea.kind, idea.search), image: null, source: null };
    return { link: url, image: await previewImage(url), source: new URL(url).hostname.replace(/^www\./, "") };
  }));
  await fs.mkdir(CACHE, { recursive: true });
  await fs.writeFile(file, JSON.stringify(found), "utf-8");
  return found;
}

// One Claude call with web search: a real page for each idea.
async function findPages(ideas: { title: string; kind: IdeaKind; search: string }[]) {
  const client = new Anthropic();
  const list = ideas.map((x, i) => `${i + 1}. ${x.title} (${x.kind}; search: ${x.search})`).join("\n");
  const messages: Anthropic.Beta.BetaMessageParam[] = [{
    role: "user",
    content: `For each idea, search the web and choose ONE real page where the person can buy it, book it, `
      + `read the recipe or see the place: a product page at a well-known shop, a recipe page, or the place's own site. `
      + `Prefer pages with a photo. Then reply with only a JSON array like [{"i":1,"url":"https://..."}], `
      + `using only URLs that appeared in your search results; skip an idea if nothing fits.\n\n${list}`,
  }];
  const seen = new Set<string>();
  let text = "";
  for (let turn = 0; turn < 3; turn++) {
    const r = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: "low" },
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: ideas.length + 2 }],
      messages,
    });
    for (const b of r.content) {
      if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
        for (const res of b.content) if (res.type === "web_search_result") seen.add(res.url);
      }
      if (b.type === "text") text += b.text;
    }
    if (r.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: r.content });     // let the search continue
  }
  const out = new Map<number, string>();
  const json = text.match(/\[[\s\S]*\]/);
  if (!json) return out;
  for (const row of JSON.parse(json[0]) as { i: number; url: string }[]) {
    if (typeof row?.url === "string" && seen.has(row.url) && safeUrl(row.url)) out.set(row.i, row.url);
  }
  return out;
}

// Only public https pages (never this computer or the local network).
function safeUrl(u: string) {
  try {
    const url = new URL(u);
    const h = url.hostname;
    return url.protocol === "https:" && h.includes(".") && !/^[\d.:[\]]+$/.test(h) && !h.endsWith(".local") && !h.endsWith(".localhost");
  } catch {
    return false;
  }
}

// The page's own preview photo (what chat apps show for a link).
async function previewImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000), redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (Macintosh) PeriLinkPreview", accept: "text/html" },
    });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html")) return null;
    const html = (await res.text()).slice(0, 400_000);
    const tag = html.match(/<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["'][^>]*>/i)?.[0];
    const src = tag?.match(/content=["']([^"']+)["']/i)?.[1];
    if (!src) return null;
    const img = new URL(src.replace(/&amp;/g, "&"), res.url).toString();
    return safeUrl(img) ? img : null;
  } catch {
    return null;
  }
}
