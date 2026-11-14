// Talks to the web app running on the Mac (npm run dev, port 3000). In Expo Go the phone
// already reaches the Mac for the app bundle, so the same address is used here.
import Constants from "expo-constants";
import type { Kind, Todo } from "./types";

export function serverUrl(): string | null {
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  return host ? `http://${host}:3000` : null;
}

function base(): string {
  const b = serverUrl();
  if (!b) throw new Error("Can't find the Mac. Start the app with npx expo start on the same Wi-Fi.");
  return b;
}

async function call<T>(path: string, init?: RequestInit, timeoutMs = 15000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base()}${path}`, { ...init, signal: controller.signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? `The Mac answered ${res.status}.`);
    return data as T;
  } catch (e) {
    if ((e as Error).name === "AbortError") throw new Error("The Mac took too long to answer.");
    if ((e as Error).message === "Network request failed")
      throw new Error("Can't reach the Mac. Is npm run dev running, on the same Wi-Fi?");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// ---- what the band heard

export type ServerPerson = { id: string; name: string; lastHeard: string; lastAt: string };
export type ServerTodo = Omit<Todo, "personId"> & { personId: string | null; personName: string | null; heardIso: string; voiceKnown: boolean };
export type UnknownVoice = { interaction_id: string; speaker: number; quote: string; title: string; heard: string; seconds: number };
export type Snapshot = { people: ServerPerson[]; todos: ServerTodo[]; unknownVoices: UnknownVoice[] };

export const fetchSnapshot = () => call<Snapshot>("/api/sendly", { cache: "no-store" } as RequestInit, 8000);

export const updatePromise = (id: string, change: { person_name?: string | null; status?: Todo["status"] }) =>
  call(`/api/sendly/promises/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(change) });

export const nameVoice = (v: UnknownVoice, name: string) =>
  call("/api/sendly/voices", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ interaction_id: v.interaction_id, speaker: v.speaker, name }),
  });

export const createPromise = (p: {
  title: string; quote: string; kind: Kind; amount: number | null; due_label: string; due_detail: string | null; person_name: string | null;
}) => call("/api/sendly/promises", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });

// Spoken recap of the last week with someone (ElevenLabs on the Mac).
export type Recap = { text: string; audio: string | null; note?: string };
export async function fetchRecap(name: string): Promise<Recap> {
  const r = await call<Recap>(`/api/sendly/recap?name=${encodeURIComponent(name)}`, undefined, 60000);
  return { ...r, audio: r.audio ? `${base()}${r.audio}` : null };
}

// ---- screen 9: say a promise out loud

export type Parsed = {
  quote: string;
  is_promise: boolean;
  person_name: string | null;
  title: string;
  kind: Kind;
  amount: number | null;
  due_label: string;
  due_detail: string | null;
};

// Sends a recording (file uri) or typed words; returns what Claude understood.
export async function parsePromise(input: { uri?: string; text?: string }, people: string[]): Promise<Parsed> {
  const form = new FormData();
  form.append("people", people.join(", "));
  if (input.text) form.append("text", input.text);
  if (input.uri) form.append("audio", { uri: input.uri, name: "promise.m4a", type: "audio/mp4" } as unknown as Blob);
  return call<Parsed>("/api/voice-todo", { method: "POST", body: form }, 30000);
}
