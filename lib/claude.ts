// One structured Claude call, with a small file cache so the phone gets instant answers
// until something new happens (the cache key is the input itself).
import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";

const CACHE = path.join(process.cwd(), "data", "cache");

export async function askJson<T>(opts: {
  system: string; user: string; schema: Record<string, unknown>; effort?: "low" | "medium" | "high"; cache?: string;
}): Promise<T> {
  const key = opts.cache ? createHash("sha1").update(opts.cache + opts.system + opts.user).digest("hex").slice(0, 20) : null;
  const file = key ? path.join(CACHE, `${key}.json`) : null;
  if (file) {
    const hit = await fs.readFile(file, "utf-8").catch(() => null);
    if (hit) return JSON.parse(hit) as T;
  }
  const client = new Anthropic();
  const r = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: opts.effort ?? "low", format: { type: "json_schema", schema: opts.schema } },
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });
  if (r.stop_reason === "refusal") throw new Error("Claude declined this one.");
  if (r.stop_reason === "max_tokens") throw new Error("Claude's answer was cut off.");
  const block = r.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("No answer from Claude.");
  if (file) {
    await fs.mkdir(CACHE, { recursive: true });
    await fs.writeFile(file, block.text, "utf-8");
  }
  return JSON.parse(block.text) as T;
}

export function errorResponse(e: unknown) {
  if (e instanceof Anthropic.AuthenticationError) return { status: 500, error: "Claude did not accept the API key." };
  if (e instanceof Anthropic.RateLimitError) return { status: 429, error: "Too many requests; wait a moment." };
  if (e instanceof Anthropic.APIConnectionError) return { status: 502, error: "This computer can't reach Claude." };
  return { status: 500, error: (e as Error).message || "Something went wrong." };
}
