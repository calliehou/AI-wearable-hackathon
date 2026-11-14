// Reads and updates the interactions the band listener (listener/listen.py) saves.
// Real recordings: data/interactions.json (gitignored). If it doesn't exist yet, the app
// shows data/interactions.sample.json so screens work before the first recording. // MOCK
import { promises as fs } from "fs";
import path from "path";

import type { Interaction } from "./people";

export { displayName, others } from "./people";
export type { Interaction, Person, Turn } from "./people";

const DATA = path.join(process.cwd(), "data", "interactions.json");
const SAMPLE = path.join(process.cwd(), "data", "interactions.sample.json");
const VOICEPRINTS = path.join(process.cwd(), "data", "voiceprints.json");

// Teach the band listener that this voiceprint belongs to `name` (and to nobody else).
async function learnVoice(voiceprint: number[] | null | undefined, name: string | null) {
  if (!voiceprint || voiceprint.length === 0) return;
  let prints: Record<string, number[][]> = {};
  try {
    prints = JSON.parse(await fs.readFile(VOICEPRINTS, "utf-8"));
  } catch {
    /* no voiceprints yet */
  }
  const same = (a: number[]) => a.length === voiceprint.length && a.every((x, i) => Math.abs(x - voiceprint[i]) < 1e-4);
  for (const who of Object.keys(prints)) {
    prints[who] = prints[who].filter((v) => !same(v));
    if (prints[who].length === 0) delete prints[who];
  }
  if (name) prints[name] = [...(prints[name] ?? []), voiceprint].slice(-40);
  const tmp = VOICEPRINTS + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(prints), "utf-8");
  await fs.rename(tmp, VOICEPRINTS);
}

export async function isSample(): Promise<boolean> {
  try {
    await fs.access(DATA);
    return false;
  } catch {
    return true;
  }
}

export async function listInteractions(): Promise<Interaction[]> {
  const file = (await isSample()) ? SAMPLE : DATA;
  const items: Interaction[] = JSON.parse(await fs.readFile(file, "utf-8"));
  return items.sort((a, b) => b.started_at.localeCompare(a.started_at));
}

export async function getInteraction(id: string): Promise<Interaction | undefined> {
  return (await listInteractions()).find((i) => i.id === id);
}

// Rename one speaker in one interaction. Only real recordings can be changed.
export async function renamePerson(id: string, speaker: number, name: string | null) {
  if (await isSample()) throw new Error("sample data is read-only");
  const items: Interaction[] = JSON.parse(await fs.readFile(DATA, "utf-8"));
  const item = items.find((i) => i.id === id);
  const person = item?.people.find((p) => p.speaker === speaker);
  if (!item || !person) return undefined;
  person.name = name && name.trim() ? name.trim().slice(0, 60) : null;
  person.evidence = "Named in the app.";
  await learnVoice(person.voiceprint, person.name);
  const tmp = DATA + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(items, null, 2), "utf-8");
  await fs.rename(tmp, DATA);
  return item;
}
