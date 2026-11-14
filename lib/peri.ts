// Real data for the Peri phone app, built from what the band listener saved:
// data/promises.json (promises you made), data/interactions.json (conversations, voices),
// data/circles.json (your circles / tags), data/live.json (band status).
import { promises as fs } from "fs";
import path from "path";
import { listInteractions, renamePerson, type Interaction } from "./interactions";

const DATA = path.join(process.cwd(), "data");
const PROMISES = path.join(DATA, "promises.json");
const CIRCLES = path.join(DATA, "circles.json");
const LIVE = path.join(DATA, "live.json");
const CONTROL = path.join(DATA, "control.json");

export type Kind = "money" | "gift" | "task" | "plan" | "send" | "call" | "bring" | "meet" | "other";
export type PromiseType = "Money" | "Gift" | "Task" | "Plan";

export type StoredPromise = {
  id: string;
  interaction_id: string;
  heard_at: string;
  title: string;
  quote: string;
  kind: Kind;
  amount: number | null;
  due_label: string;
  due_detail: string | null;
  confidence: number;
  speaker: number | null;
  person_name: string | null;
  status: "open" | "done" | "dismissed";
  note?: string | null;
};

// The design's four kinds of promise.
export function typeOf(kind: Kind): PromiseType {
  if (kind === "money") return "Money";
  if (kind === "gift") return "Gift";
  if (kind === "plan" || kind === "call" || kind === "meet") return "Plan";
  return "Task";
}
const KIND_FOR_TYPE: Record<PromiseType, Kind> = { Money: "money", Gift: "gift", Task: "task", Plan: "plan" };

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf-8")) as T;
  } catch {
    return fallback;
  }
}
async function writeJson(file: string, value: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = file + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), "utf-8");
  await fs.rename(tmp, file);
}

const readPromises = () => readJson<StoredPromise[]>(PROMISES, []);
const writePromises = (items: StoredPromise[]) => writeJson(PROMISES, items);

export function personId(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "person";
}

export function ago(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return new Date(iso).toLocaleDateString([], { weekday: "long" });
  return days < 14 ? "last week" : `${Math.round(days / 7)}w ago`;
}
function short(iso: string) {
  const days = (Date.now() - new Date(iso).getTime()) / 86400000;
  if (days < 1) return `${Math.max(1, Math.round(days * 24))}h`;
  if (days < 7) return `${Math.round(days)}d`;
  return `${Math.round(days / 7)}w`;
}
function clock(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
function when(iso: string) {
  const d = new Date(iso);
  const days = (Date.now() - d.getTime()) / 86400000;
  if (days < 1 && d.getDate() === new Date().getDate()) return "Today";
  if (days < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

async function realInteractions(): Promise<Interaction[]> {
  return (await listInteractions()).filter((i) => i.source !== "sample");
}

// ---- circles (tags)

export type Circle = { name: string; color: string };
type CircleFile = { circles: Circle[]; members: Record<string, string[]> };
const DEFAULT_CIRCLES: Circle[] = [
  { name: "Family", color: "#CDEBD6" },
  { name: "Friends", color: "#FFE3B8" },
  { name: "Work", color: "#CDEBFB" },
  { name: "School", color: "#E3D9FF" },
];
export const readCircles = () => readJson<CircleFile>(CIRCLES, { circles: DEFAULT_CIRCLES, members: {} });

export async function createCircle(name: string, color: string) {
  const f = await readCircles();
  const clean = name.trim().slice(0, 30);
  if (clean && !f.circles.some((c) => c.name.toLowerCase() === clean.toLowerCase())) f.circles.push({ name: clean, color });
  await writeJson(CIRCLES, f);
  return f;
}

export async function setMembership(person: string, circle: string, member: boolean) {
  const f = await readCircles();
  const id = personId(person);
  const now = new Set(f.members[id] ?? []);
  if (member) now.add(circle);
  else now.delete(circle);
  f.members[id] = [...now];
  await writeJson(CIRCLES, f);
  return f;
}

// ---- the snapshot the app polls

export type UnknownVoice = { interaction_id: string; speaker: number; quote: string; title: string; heard: string; seconds: number };

export async function snapshot() {
  const [stored, interactions, circleFile, live, control] = await Promise.all([
    readPromises(), realInteractions(), readCircles(),
    readJson<{ updated_at?: number; connected?: boolean; recording?: boolean } | null>(LIVE, null),
    readJson<{ paused?: boolean }>(CONTROL, {}),
  ]);
  type P = { id: string; name: string; lastAt: string; talks30: number; talks14: number; moments: number };
  const people = new Map<string, P>();
  const now = Date.now();
  const seen = (name: string, at: string, talk: boolean) => {
    const id = personId(name);
    const p = people.get(id) ?? { id, name, lastAt: at, talks30: 0, talks14: 0, moments: 0 };
    if (at > p.lastAt) p.lastAt = at;
    if (talk) {
      const days = (now - new Date(at).getTime()) / 86400000;
      if (days <= 30) p.talks30++;
      if (days <= 14) p.talks14++;
      p.moments++;
    }
    people.set(id, p);
  };
  const unknown: UnknownVoice[] = [];
  const weekAgo = new Date(now - 7 * 86400000).toISOString();
  for (const it of interactions) {
    for (const p of it.people) {
      if (p.is_wearer) continue;
      if (p.name) seen(p.name, it.started_at, true);
      else if (it.started_at > weekAgo && p.voiceprint) {
        const turns = it.turns.filter((t) => t.speaker === p.speaker);
        const seconds = turns.reduce((s, t) => s + (t.end - t.start), 0);
        if (seconds < 3) continue;
        const longest = turns.reduce((a, b) => (b.text.length > a.text.length ? b : a));
        unknown.push({
          interaction_id: it.id, speaker: p.speaker, title: it.title, heard: ago(it.started_at), seconds: Math.round(seconds),
          quote: longest.text.length > 140 ? longest.text.slice(0, 137) + "…" : longest.text,
        });
      }
    }
  }
  for (const pr of stored) if (pr.person_name) seen(pr.person_name, pr.heard_at, false);
  for (const id of Object.keys(circleFile.members)) if (!people.has(id) && circleFile.members[id].length) {
    // someone you put in a circle but the band hasn't heard yet
    people.set(id, { id, name: id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), lastAt: "1970-01-01T00:00:00Z", talks30: 0, talks14: 0, moments: 0 });
  }

  const todos = stored
    .filter((p) => p.status !== "dismissed")
    .map((p) => ({
      id: p.id,
      title: p.title,
      quote: p.quote,
      kind: p.kind,
      type: typeOf(p.kind),
      personId: p.person_name ? personId(p.person_name) : null,
      personName: p.person_name,
      amount: p.amount ?? undefined,
      note: p.note ?? undefined,
      dueLabel: p.due_label,
      dueDetail: p.due_detail ?? undefined,
      heardLabel: `heard ${ago(p.heard_at)}`,
      heardAt: clock(p.heard_at),
      heardIso: p.heard_at,
      confidence: p.confidence,
      status: p.status,
      voiceKnown: p.speaker !== null,
    }));

  const peopleOut = [...people.values()].map((p) => {
    const open = todos.filter((t) => t.personId === p.id && t.status === "open").length;
    const kept = todos.filter((t) => t.personId === p.id && t.status === "done").length;
    const daysQuiet = (now - new Date(p.lastAt).getTime()) / 86400000;
    // Orbit: 1 = inner (open promises or lots of talk), 2 = middle, 3 = outer / drifting.
    const ring = open > 0 || p.talks14 >= 3 ? 1 : daysQuiet <= 14 ? 2 : 3;
    return {
      id: p.id, name: p.name, lastAt: p.lastAt,
      lastHeard: p.moments ? `Heard ${ago(p.lastAt)}` : "Not heard yet",
      lastTalk: p.moments ? short(p.lastAt) : "—",
      moments: p.talks30, open, kept, ring,
      drifting: p.moments > 0 && daysQuiet > 14,
      quietFor: p.moments ? short(p.lastAt) : null,
      circles: circleFile.members[p.id] ?? [],
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  // Suggestions for Ask Peri (rules, no AI): drifting people, promises due soon.
  const recs: { kind: string; personId: string | null; title: string; sub: string; cta: string; target: string }[] = [];
  for (const p of peopleOut.filter((x) => x.drifting).slice(0, 2)) {
    recs.push({ kind: "drift", personId: p.id, title: `${p.name.split(" ")[0]} is drifting out of orbit`, sub: `${p.quietFor} quiet`, cta: "Ask Peri for an idea", target: `/ask?about=${encodeURIComponent(p.name)}` });
  }
  for (const t of todos.filter((x) => x.status === "open" && ["Today", "Tonight"].includes(x.dueLabel)).slice(0, 3)) {
    recs.push({ kind: "due", personId: t.personId, title: t.title, sub: `Due ${t.dueLabel.toLowerCase()}${t.dueDetail ? " · " + t.dueDetail : ""}`, cta: t.type === "Gift" ? "See gift ideas" : "Open", target: t.type === "Gift" && t.personId ? `/gifts/${t.personId}` : `/promise/${t.id}` });
  }

  const today = new Date().toDateString();
  const fresh = live?.updated_at ? Date.now() / 1000 - live.updated_at < 10 : false;
  return {
    people: peopleOut,
    todos,
    unknownVoices: unknown.slice(0, 10),
    circles: circleFile.circles,
    recs,
    stats: {
      promisesToday: stored.filter((p) => new Date(p.heard_at).toDateString() === today && p.interaction_id !== "app").length,
      conversationsToday: interactions.filter((i) => new Date(i.started_at).toDateString() === today).length,
    },
    band: { running: fresh, connected: fresh && !!live?.connected, recording: fresh && !!live?.recording, paused: !!control.paused },
  };
}

// ---- changes from the app

export async function updatePromise(id: string, change: {
  person_name?: string | null; status?: StoredPromise["status"]; type?: PromiseType; due_label?: string; due_detail?: string | null;
  amount?: number | null; title?: string;
}) {
  const items = await readPromises();
  const pr = items.find((p) => p.id === id);
  if (!pr) return undefined;
  if (change.status) pr.status = change.status;
  if (change.type && KIND_FOR_TYPE[change.type] && typeOf(pr.kind) !== change.type) pr.kind = KIND_FOR_TYPE[change.type];
  if (change.due_label) pr.due_label = change.due_label.slice(0, 20);
  if (change.due_detail !== undefined) pr.due_detail = change.due_detail;
  if (change.amount !== undefined) pr.amount = change.amount;
  if (change.title) pr.title = change.title.slice(0, 80);
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

export async function addPromise(b: {
  title: string; quote: string; kind?: Kind; amount?: number | null; due_label?: string; due_detail?: string | null; person_name?: string | null;
}) {
  const kinds: Kind[] = ["money", "gift", "task", "plan", "send", "call", "bring", "meet", "other"];
  const item: StoredPromise = {
    id: Math.random().toString(16).slice(2, 14),
    interaction_id: "app",
    heard_at: new Date().toISOString(),
    title: b.title.slice(0, 80),
    quote: b.quote.slice(0, 300),
    kind: kinds.includes(b.kind as Kind) ? (b.kind as Kind) : "task",
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

export async function setBandPaused(paused: boolean) {
  await writeJson(CONTROL, { paused });
  return { paused };
}

// ---- material about one person, for recaps, "About", places and gift ideas

export async function recentWith(name: string, days = 7) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const id = personId(name);
  const talks = (await realInteractions()).filter(
    (i) => i.started_at > since && i.people.some((p) => p.name && personId(p.name) === id),
  );
  const promises = (await readPromises()).filter((p) => p.person_name && personId(p.person_name) === id && p.status !== "dismissed");
  return { talks, promises };
}

// The conversations with someone as a log ("Recent with Kelly").
export async function logWith(name: string, days = 30) {
  const { talks } = await recentWith(name, days);
  return talks.map((t) => ({ id: t.id, title: t.title, when: when(t.started_at), note: t.summary, iso: t.started_at }));
}

// What the AI routes are allowed to see about everyone (for Ask Peri).
export async function overview() {
  const snap = await snapshot();
  const talks = (await realInteractions()).slice(0, 25);
  return { snap, talks };
}
