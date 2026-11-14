// Real data for the Sendly phone app, built from what the band listener saved:
// data/promises.json (promises you made) and data/interactions.json (conversations, voices).
import { promises as fs } from "fs";
import path from "path";
import { listInteractions, renamePerson, type Interaction } from "./interactions";

const PROMISES = path.join(process.cwd(), "data", "promises.json");

export type StoredPromise = {
  id: string;
  interaction_id: string;
  heard_at: string;
  title: string;
  quote: string;
  kind: "money" | "send" | "call" | "bring" | "meet" | "other";
  amount: number | null;
  due_label: string;
  due_detail: string | null;
  confidence: number;
  speaker: number | null;
  person_name: string | null;
  status: "open" | "done" | "dismissed";
};

async function readPromises(): Promise<StoredPromise[]> {
  try {
    return JSON.parse(await fs.readFile(PROMISES, "utf-8"));
  } catch {
    return [];
  }
}

async function writePromises(items: StoredPromise[]) {
  const tmp = PROMISES + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(items, null, 2), "utf-8");
  await fs.rename(tmp, PROMISES);
}

export function personId(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "person";
}

function ago(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return new Date(iso).toLocaleDateString([], { weekday: "long" });
  return days < 14 ? "last week" : `${Math.round(days / 7)} weeks ago`;
}

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// Someone the band heard but nobody has named yet: the app asks "Who is this?".
export type UnknownVoice = { interaction_id: string; speaker: number; quote: string; title: string; heard: string; seconds: number };

export async function snapshot() {
  const [stored, interactions] = await Promise.all([readPromises(), realInteractions()]);
  const people = new Map<string, { id: string; name: string; lastHeard: string; lastAt: string }>();
  const seen = (name: string, at: string) => {
    const id = personId(name);
    const p = people.get(id);
    if (!p || at > p.lastAt) people.set(id, { id, name, lastHeard: `Heard ${ago(at)}`, lastAt: at });
  };
  const unknown: UnknownVoice[] = [];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  for (const it of interactions) {
    for (const p of it.people) {
      if (p.is_wearer) continue;
      if (p.name) seen(p.name, it.started_at);
      else if (it.started_at > weekAgo && p.voiceprint) {
        const turns = it.turns.filter((t) => t.speaker === p.speaker);
        const seconds = turns.reduce((s, t) => s + (t.end - t.start), 0);
        if (seconds < 3) continue; // too little to recognise a voice from
        const longest = turns.reduce((a, b) => (b.text.length > a.text.length ? b : a));
        unknown.push({
          interaction_id: it.id, speaker: p.speaker, title: it.title, heard: ago(it.started_at), seconds: Math.round(seconds),
          quote: longest.text.length > 140 ? longest.text.slice(0, 137) + "…" : longest.text,
        });
      }
    }
  }
  for (const pr of stored) if (pr.person_name) seen(pr.person_name, pr.heard_at);

  const todos = stored
    .filter((p) => p.status !== "dismissed")
    .map((p) => ({
      id: p.id,
      title: p.title,
      quote: p.quote,
      kind: p.kind,
      personId: p.person_name ? personId(p.person_name) : null,
      personName: p.person_name,
      amount: p.amount ?? undefined,
      dueLabel: p.due_label,
      dueDetail: p.due_detail ?? undefined,
      heardLabel: `heard ${ago(p.heard_at)}`,
      heardAt: clock(p.heard_at),
      heardIso: p.heard_at,
      confidence: p.confidence,
      status: p.status,
      voiceKnown: p.speaker !== null,
    }));

  return {
    people: [...people.values()].sort((a, b) => a.name.localeCompare(b.name)).map(({ lastAt, ...p }) => ({ ...p, lastAt })),
    todos,
    unknownVoices: unknown.slice(0, 10),
  };
}

async function realInteractions(): Promise<Interaction[]> {
  // Only the band's own recordings, not the sample file.
  return (await listInteractions()).filter((i) => i.source !== "sample");
}

// Name the voice behind a promise (or a set status). Naming teaches the band that voice
// (renamePerson saves its voiceprint), and fills in every promise made to that voice.
export async function updatePromise(id: string, change: { person_name?: string | null; status?: StoredPromise["status"] }) {
  const items = await readPromises();
  const pr = items.find((p) => p.id === id);
  if (!pr) return undefined;
  if (change.status) pr.status = change.status;
  if (change.person_name !== undefined) {
    const name = change.person_name?.trim().slice(0, 60) || null;
    pr.person_name = name;
    if (pr.speaker !== null) {
      for (const other of items) if (other.interaction_id === pr.interaction_id && other.speaker === pr.speaker) other.person_name = name;
      await renamePerson(pr.interaction_id, pr.speaker, name).catch(() => undefined);
    }
  }
  await writePromises(items);
  return pr;
}

// "Who is this?" for a voice in a conversation: name it, learn it, and update its promises.
export async function nameVoice(interactionId: string, speaker: number, name: string) {
  const clean = name.trim().slice(0, 60);
  const it = await renamePerson(interactionId, speaker, clean || null);
  const items = await readPromises();
  let changed = false;
  for (const p of items) {
    if (p.interaction_id === interactionId && p.speaker === speaker) {
      p.person_name = clean || null;
      changed = true;
    }
  }
  if (changed) await writePromises(items);
  return it;
}

// Conversations with one person over the last days, for the spoken recap.
export async function recentWith(name: string, days = 7) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const id = personId(name);
  const talks = (await realInteractions()).filter(
    (i) => i.started_at > since && i.people.some((p) => p.name && personId(p.name) === id),
  );
  const promises = (await readPromises()).filter((p) => p.person_name && personId(p.person_name) === id && p.status !== "dismissed");
  return { talks, promises };
}

// A promise said into the app's mic (not heard by the band, so no voice to learn).
export async function addPromise(b: {
  title: string; quote: string; kind?: StoredPromise["kind"]; amount?: number | null;
  due_label?: string; due_detail?: string | null; person_name?: string | null;
}) {
  const kinds = ["money", "send", "call", "bring", "meet", "other"];
  const item: StoredPromise = {
    id: Math.random().toString(16).slice(2, 14),
    interaction_id: "app",
    heard_at: new Date().toISOString(),
    title: b.title.slice(0, 80),
    quote: b.quote.slice(0, 300),
    kind: kinds.includes(b.kind ?? "") ? (b.kind as StoredPromise["kind"]) : "other",
    amount: typeof b.amount === "number" ? b.amount : null,
    due_label: b.due_label || "Soon",
    due_detail: b.due_detail ?? null,
    confidence: 1,
    speaker: null,
    person_name: b.person_name?.trim() || null,
    status: "open",
  };
  await writePromises([item, ...(await readPromises())]);
  return item;
}
