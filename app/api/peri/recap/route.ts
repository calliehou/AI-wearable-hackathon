// "Recent activity" on a contact card: a short spoken recap of the last 7 days with someone.
// Claude writes it from the band's conversations and promises; ElevenLabs reads it aloud.
// The audio is cached in data/recaps/ (gitignored) until something new happens with that person.
import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { recentWith } from "@/lib/peri";

export const dynamic = "force-dynamic";

const DIR = path.join(process.cwd(), "data", "recaps");
const VOICE = process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb"; // ElevenLabs' example voice; set your own in .env
const WEARER = "Mapa";

const SYSTEM = `You write a very short spoken recap about one person, read aloud into ${WEARER}'s earbuds (call ${WEARER} "you").
At most 3 short sentences and 45 words, natural spoken English, no lists, no emoji:
1. What your last conversation with them was about (one sentence).
2. Any promise you still owe them, with what and when. If there is none, skip this sentence.
3. One fun fact or useful thing to remember about them, from the material. If there is none, skip it.
Use their first name or "they"; never guess "he" or "she". Only facts from the material; never invent.`;

export async function GET(req: Request) {
  const name = new URL(req.url).searchParams.get("name")?.trim();
  if (!name) return NextResponse.json({ error: "send ?name=" }, { status: 400 });
  const { talks, promises } = await recentWith(name, 30);
  const first = name.split(" ")[0];
  if (!talks.length && !promises.length) {
    return NextResponse.json({ text: `Your band hasn't heard you and ${first} talk yet.`, audio: null, note: "nothing yet" });
  }

  const material = [
    ...promises.filter((p) => p.status === "open").map((p) => `Open promise: ${p.title} (due ${p.due_label}${p.due_detail ? " " + p.due_detail : ""}). You said: "${p.quote}"`),
    ...talks.slice(0, 8).map((t, i) => `${i === 0 ? "MOST RECENT · " : ""}${new Date(t.started_at).toDateString()}: ${t.title}. ${t.summary}${t.topics.length ? " Topics: " + t.topics.join(", ") + "." : ""}${t.follow_ups.length ? " Follow-ups: " + t.follow_ups.join("; ") : ""}`),
  ].join("\n");
  const key = createHash("sha1").update(name + material).digest("hex").slice(0, 16);
  const mp3 = path.join(DIR, `${key}.mp3`);
  const txt = path.join(DIR, `${key}.txt`);

  try {
    const cached = await fs.readFile(txt, "utf-8").catch(() => null);
    let text = cached;
    if (!text) {
      const client = new Anthropic();
      const r = await client.beta.messages.create({
        model: "claude-opus-5-5",
        max_tokens: 4000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        thinking: { type: "adaptive" },
        output_config: { effort: "low" },
        system: SYSTEM,
        messages: [{ role: "user", content: `Person: ${name}\n\n${material}` }],
      });
      const block = r.content.find((b) => b.type === "text");
      if (r.stop_reason === "refusal" || !block || block.type !== "text") throw new Error("Couldn't write the recap.");
      text = block.text.trim();
      await fs.mkdir(DIR, { recursive: true });
      await fs.writeFile(txt, text, "utf-8");
    }

    const haveAudio = await fs.access(mp3).then(() => true, () => false);
    if (!haveAudio) {
      const elevenKey = process.env.ELEVENLABS_API_KEY;
      if (!elevenKey) return NextResponse.json({ text, audio: null, note: "No ELEVENLABS_API_KEY in .env: the phone reads it instead." });
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "xi-api-key": elevenKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify({ text, model_id: "eleven_multilingual_v2" }),
      });
      if (!res.ok) return NextResponse.json({ text, audio: null, note: `ElevenLabs answered ${res.status}: the phone reads it instead.` });
      await fs.writeFile(mp3, Buffer.from(await res.arrayBuffer()));
    }
    return NextResponse.json({ text, audio: `/api/peri/recap/audio/${key}.mp3` });
  } catch (e) {
    if (e instanceof Anthropic.APIConnectionError) return NextResponse.json({ error: "This computer can't reach Claude." }, { status: 502 });
    return NextResponse.json({ error: (e as Error).message || "Recap failed." }, { status: 500 });
  }
}
