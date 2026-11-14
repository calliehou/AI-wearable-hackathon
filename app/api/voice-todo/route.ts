// "Hold mic · tell a promise" in the Peri app. The phone sends the recording (or typed
// words); Deepgram turns speech into text; Claude sorts it into one or more promises
// (who it's for, what, when). Keys stay on this computer (.env): the phone never sees them.
import { NextResponse } from "next/server";
import { askJson, errorResponse } from "@/lib/claude";

export const dynamic = "force-dynamic";

const SCHEMA = {
  type: "object",
  properties: {
    promises: {
      type: "array",
      items: {
        type: "object",
        properties: {
          person_name: { type: ["string", "null"] },
          title: { type: "string" },
          kind: { type: "string", enum: ["money", "gift", "task", "plan", "call"] },
          amount: { type: ["number", "null"] },
          due_label: { type: "string" },
          due_detail: { type: ["string", "null"] },
        },
        required: ["person_name", "title", "kind", "amount", "due_label", "due_detail"],
        additionalProperties: false,
      },
    },
  },
  required: ["promises"],
  additionalProperties: false,
};

const SYSTEM = `You sort what the speaker just said into the promises they made to other people. One sentence can hold several ("bring Leo his charger tomorrow, and I owe Mom $40").
For each promise:
- person_name: who it's for, exactly as said ("Leo", "Mom"). If one of the known people clearly matches, use that exact known name. If nobody is named, null. Never invent a name.
- title: short imperative, max 6 words, with the person's name when natural ("Bring Leo his charger", "Pay Mom back $40").
- kind: money (paying, owing, sending money), gift (a present or an occasion), task (send, bring, do something), plan (meet up, an outing), or call.
- amount: the number for money promises, else null.
- due_label: "Today", "Tonight", "Tmrw", a weekday like "Fri", or "Soon" if no time was given.
- due_detail: a time like "5:00 PM" if said or clearly implied, else null.
If nothing said is a promise to someone, return an empty list.`;

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
    if (!text && audio instanceof Blob) {
      // Phones may label the m4a as "" or application/octet-stream; Deepgram needs an audio type.
      const type = audio.type.startsWith("audio/") ? audio.type : "audio/mp4";
      text = await transcribe(await audio.arrayBuffer(), type);
    }
    if (!text) return NextResponse.json({ error: "Nothing was heard. Try again a little closer to the phone." }, { status: 422 });
    const out = await askJson<{ promises: unknown[] }>({
      system: SYSTEM,
      schema: SCHEMA,
      user: `Known people: ${people || "(none)"}\nToday is ${new Date().toDateString()}.\nWhat they said: "${text}"`,
    });
    return NextResponse.json({ quote: text, promises: out.promises });
  } catch (e) {
    const r = errorResponse(e);
    return NextResponse.json({ error: r.error }, { status: r.status });
  }
}
