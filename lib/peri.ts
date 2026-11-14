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
const PAYEES = path.join(DATA, "payees.json");
const ORBITS = path.join(DATA, "orbits.json"); // { personId: 1 | 2 | 3 } chosen in the app

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
  person_source?: "voice" | "named" | "picked" | null; // "named": said aloud, not yet picked from contacts
  status: "open" | "done" | "dismissed";
  note?: string | null;
  rank?: number | null; // your order (lower first); unset = by date
  due_date?: string | null; // "2026-11-20" when known (said in the conversation or set in the app)
  due_time?: string | null; // "17:00" when known
};

// The design's four kinds of promise.
export function typeOf(kind: Kind): PromiseType {
  if (kind === "money") return "Money";
  if (kind === "gift") return "Gift";
  if (kind === "plan" || kind === "call" || kind === "meet") return "Plan";
  return "Task";
}
const KIND_FOR_TYPE: Record<PromiseType, Kind> = { Money: "money", Gift: "gift", Task: "task", Plan: "plan" };

// "Today"/"Tonight"/"Tmrw"/"Fri"/"Nov 28" and "5:00 PM" from a date and time, as of now.
export function dueLabels(date: string | null | undefined, time: string | null | undefined) {
  let label: string | null = null;
  let detail: string | null = null;
  if (time && /^\d{2}:\d{2}$/.test(time)) {
    const [h, m] = time.split(":").map(Number);
    detail = new Date(2000, 0, 1, h, m).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, mo, d] = date.split("-").map(Number);
    const due = new Date(y, mo - 1, d);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = Math.round((due.getTime() - today.getTime()) / 86400000);
    const evening = time ? Number(time.slice(0, 2)) >= 18 : false;
    if (days < 0) label = due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    else if (days === 0) label = evening ? "Tonight" : "Today";
    else if (days === 1) label = "Tmrw";
    else if (days < 7) label = due.toLocaleDateString("en-US", { weekday: "short" });
    else label = due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return { label, detail };
}

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

// ---- payment usernames (Venmo / Cash App / PayPal), entered once per person in the app

export type Payee = { venmo?: string; cashapp?: string; paypal?: string; method?: "venmo" | "cashapp" | "paypal" };
export const readPayees = () => readJson<Record<string, Payee>>(PAYEES, {});

export async function setPayee(person: string, change: Payee) {
  const all = await readPayees();
  const id = personId(person);
  const clean = (v?: string) => v?.trim().replace(/^[@$]/, "").replace(/[^A-Za-z0-9_.-]/g, "").slice(0, 40) || undefined;
  const next: Payee = { ...all[id] };
  for (const k of ["venmo", "cashapp", "paypal"] as const) if (change[k] !== undefined) next[k] = clean(change[k]);
  if (change.method) next.method = change.method;
  all[id] = next;
  await writeJson(PAYEES, all);
  return next;
}

// ---- the snapshot the app polls

export type UnknownVoice = { interaction_id: string; speaker: number; quote: string; title: string; heard: string; seconds: number };

export async function snapshot() {
  const [stored, interactions, circleFile, live, control, payees, orbits] = await Promise.all([
    readPromises(), realInteractions(), readCircles(),
    readJson<{ updated_at?: number; connected?: boolean; recording?: boolean } | null>(LIVE, null),
    readJson<{ paused?: boolean }>(CONTROL, {}),
    readPayees(),
    readJson<Record<string, 1 | 2 | 3>>(ORBITS, {}),
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
    .map((p) => ({ p, when: dueLabels(p.due_date, p.due_time) }))
    .map(({ p, when }) => ({
      id: p.id,
      title: p.title,
      quote: p.quote,
      kind: p.kind,
      type: typeOf(p.kind),
      personId: p.person_name ? personId(p.person_name) : null,
      personName: p.person_name,
      personSource: p.person_source ?? (p.person_name ? "voice" : null),
      amount: p.amount ?? undefined,
      note: p.note ?? undefined,
      dueLabel: when.label ?? p.due_label,
      dueDetail: when.detail ?? p.due_detail ?? undefined,
      dueDate: p.due_date ?? null,
      dueTime: p.due_time ?? null,
      heardLabel: `heard ${ago(p.heard_at)}`,
      heardAt: clock(p.heard_at),
      heardIso: p.heard_at,
      confidence: p.confidence,
      status: p.status,
      voiceKnown: p.speaker !== null,
      rank: p.rank ?? null,
    }));

  const peopleOut = [...people.values()].map((p) => {
    const open = todos.filter((t) => t.personId === p.id && t.status === "open").length;
    const kept = todos.filter((t) => t.personId === p.id && t.status === "done").length;
    const daysQuiet = (now - new Date(p.lastAt).getTime()) / 86400000;
    // Orbit: 1 = inner (open promises or lots of talk), 2 = middle, 3 = outer / drifting.
    const autoRing = open > 0 || p.talks14 >= 3 ? 1 : daysQuiet <= 14 ? 2 : 3;
    const chosen = orbits[p.id];
    const ring = chosen ?? autoRing;
    return {
      id: p.id, name: p.name, lastAt: p.lastAt,
      lastHeard: p.moments ? `Heard ${ago(p.lastAt)}` : "Not heard yet",
      lastTalk: p.moments ? short(p.lastAt) : "—",
      moments: p.talks30, open, kept, ring, ringChosen: chosen !== undefined,
      drifting: p.moments > 0 && daysQuiet > 14,
      quietFor: p.moments ? short(p.lastAt) : null,
      circles: circleFile.members[p.id] ?? [],
      payee: payees[p.id] ?? {},
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
  amount?: number | null; title?: string; due_date?: string | null; due_time?: string | null;
}) {
  const items = await readPromises();
  const pr = items.find((p) => p.id === id);
  if (!pr) return undefined;
  if (change.status) pr.status = change.status;
  if (change.type && KIND_FOR_TYPE[change.type] && typeOf(pr.kind) !== change.type) pr.kind = KIND_FOR_TYPE[change.type];
  if (change.due_label) pr.due_label = change.due_label.slice(0, 20);
  if (change.due_detail !== undefined) pr.due_detail = change.due_detail;
  if (change.amount !== undefined) pr.amount = change.amount;
  if (change.due_date !== undefined) pr.due_date = change.due_date;
  if (change.due_time !== undefined) pr.due_time = change.due_time;
  if (change.due_date !== undefined || change.due_time !== undefined) {
    const when = dueLabels(pr.due_date, pr.due_time);
    if (when.label) pr.due_label = when.label;
    else if (change.due_date === null) pr.due_label = "Soon";
    pr.due_detail = when.detail ?? (change.due_time === null ? null : pr.due_detail);
  }
  if (change.title) pr.title = change.title.slice(0, 80);
  if (change.person_name !== undefined) {
    const name = change.person_name?.trim().slice(0, 60) || null;
    pr.person_name = name;
    pr.person_source = name ? "picked" : null;
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
  due_date?: string | null; due_time?: string | null;
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
    due_date: validDate(b.due_date),
    due_time: validTime(b.due_time),
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

// Remove a promise for good (the app asks first).
export async function deletePromise(id: string) {
  const items = await readPromises();
  const left = items.filter((p) => p.id !== id);
  if (left.length === items.length) return false;
  await writePromises(left);
  return true;
}

// Rename a person everywhere Peri knows them: promises, conversations, circles, Venmo
// username and the voice memory (so the band recognises them under the new name).
export async function renamePersonEverywhere(from: string, to: string) {
  const oldId = personId(from);
  const name = to.trim().slice(0, 60);
  if (!name) throw new Error("The new name is empty.");
  const newId = personId(name);
  const same = (n: string | null | undefined) => !!n && personId(n) === oldId;
  let changes = 0;

  const promises = await readPromises();
  for (const p of promises) if (same(p.person_name)) { p.person_name = name; changes++; }
  await writePromises(promises);

  const INTER = path.join(DATA, "interactions.json");
  const inter = await readJson<Interaction[]>(INTER, []);
  for (const it of inter) for (const p of it.people) if (same(p.name)) { p.name = name; changes++; }
  if (inter.length) await writeJson(INTER, inter);

  const circles = await readCircles();
  if (circles.members[oldId]) {
    circles.members[newId] = [...new Set([...(circles.members[newId] ?? []), ...circles.members[oldId]])];
    if (newId !== oldId) delete circles.members[oldId];
    await writeJson(CIRCLES, circles);
  }

  const payees = await readPayees();
  if (payees[oldId]) {
    payees[newId] = { ...payees[oldId], ...payees[newId] };
    if (newId !== oldId) delete payees[oldId];
    await writeJson(PAYEES, payees);
  }

  const orbits = await readJson<Record<string, 1 | 2 | 3>>(ORBITS, {});
  if (orbits[oldId] !== undefined && newId !== oldId) {
    orbits[newId] = orbits[oldId];
    delete orbits[oldId];
    await writeJson(ORBITS, orbits);
  }

  const VOICES = path.join(DATA, "voiceprints.json");
  const voices = await readJson<Record<string, number[][]>>(VOICES, {});
  const key = Object.keys(voices).find((k) => personId(k) === oldId);
  if (key && key !== name) {
    voices[name] = [...(voices[name] ?? []), ...voices[key]].slice(-40);
    delete voices[key];
    await writeJson(VOICES, voices);
  }
  return { id: newId, name, changes };
}


// Choose someone's orbit (1 inner, 2 middle, 3 outer), or null to let Peri decide again.
export async function setOrbit(person: string, ring: 1 | 2 | 3 | null) {
  const all = await readJson<Record<string, 1 | 2 | 3>>(ORBITS, {});
  const id = personId(person);
  if (ring === null) delete all[id];
  else all[id] = ring;
  await writeJson(ORBITS, all);
  return { id, ring };
}


// Your order for a group of promises: ids in the order you want them (first = top).
export async function reorderPromises(ids: string[]) {
  const items = await readPromises();
  const pos = new Map(ids.map((id, i) => [id, i]));
  for (const p of items) if (pos.has(p.id)) p.rank = pos.get(p.id)!;
  await writePromises(items);
  return { ok: true, count: pos.size };
}

export const validDate = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
export const validTime = (v: unknown) => (typeof v === "string" && /^\d{2}:\d{2}$/.test(v) ? v : null);
