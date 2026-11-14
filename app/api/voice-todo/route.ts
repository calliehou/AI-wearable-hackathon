// Screen 9 of the Peri app: "say a promise out loud". The phone sends the recording (or
// typed words); Deepgram turns speech into text; Claude reads who it's for, what, and when.
// Keys stay on this computer (.env): the phone never sees them.
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SCHEMA = {
  type: "object",
  properties: {
    is_promise: { type: "boolean" },
    person_name: { type: ["string", "null"] },
    title: { type: "string" },
    kind: { type: "string", enum: ["money", "send", "call", "bring", "meet", "other"] },
    amount: { type: ["number", "null"] },
    due_label: { type: "string" },
    due_detail: { type: ["string", "null"] },
  },
  required: ["is_promise", "person_name", "title", "kind", "amount", "due_label", "due_detail"],
  additionalProperties: false,
} as const;

const SYSTEM = `You turn one spoken sentence into a to-do the speaker promised another person.
- person_name: the person it's for, exactly as said ("Ana", "Mom"). If one of the known people clearly matches, use that exact known name. If no person is named, null. Never invent a name.
- title: short imperative, max 6 words, without the person's name unless needed ("Send the lease", "Pay back lunch").
- kind: money (paying, owing, sending money), send (a file, link, photos), call, bring, meet, or other.
- amount: the number for money promises, else null.
- due_label: a short label like "Today", "Tonight", "Tmrw", "Fri", "Mon", or "Soon" if no time was given.
- due_detail: a time like "5:00 PM" if said or clearly implied (by Friday -> "5:00 PM"), else null.
- is_promise: false if the sentence is not something the speaker will do for someone.`;

async function transcribe(audio: ArrayBuffer, type: string): Promise<string> {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) throw new Error("No DEEPGRAM_API_KEY in the .env file.");
  const res = await fetch("https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&mip_opt_out=true", {
    method: "POST",
    headers: { Authorization: `Token ${key}`, "Content-Type": type || "audio/mp4" },
    body: audio,
  });
  if (!res.ok) throw new Error(`Deepgram answered ${res.status}.`);
  const data = await res.json();
  return (data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "").trim();
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const people = String(form.get("people") ?? "");
    let text = String(form.get("text") ?? "").trim();
    const audio = form.get("audio");
    if (!text && audio instanceof Blob) text = await transcribe(await audio.arrayBuffer(), audio.type);
    if (!text) return NextResponse.json({ error: "Nothing was heard. Try again a little closer to the phone." }, { status: 422 });

    const client = new Anthropic();
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM,
      messages: [{ role: "user", content: `Known people: ${people || "(none)"}\nToday is ${new Date().toDateString()}.\nSentence: "${text}"` }],
    });
    if (response.stop_reason === "refusal") return NextResponse.json({ error: "Couldn't read that one. Try saying it differently." }, { status: 422 });
    const block = response.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") throw new Error("No answer from Claude.");
    return NextResponse.json({ quote: text, ...JSON.parse(block.text) });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return NextResponse.json({ error: "Claude did not accept the API key." }, { status: 500 });
    if (e instanceof Anthropic.RateLimitError) return NextResponse.json({ error: "Too many requests; wait a moment." }, { status: 429 });
    if (e instanceof Anthropic.APIConnectionError) return NextResponse.json({ error: "This computer can't reach Claude." }, { status: 502 });
    return NextResponse.json({ error: (e as Error).message || "Something went wrong." }, { status: 500 });
  }
}
